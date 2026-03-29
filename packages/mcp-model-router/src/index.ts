/**
 * BidBlender MCP Model Router
 *
 * An MCP server with four tools:
 *   1. evaluate_models     — query live OpenAI API, score, allocate, persist manifest
 *   2. get_allocations     — read current manifest and show task→model mapping
 *   3. recommend_model     — ad-hoc recommendation for any task description
 *   4. get_manifest_status — show when manifest was generated and if re-evaluation is needed
 *
 * Transport: stdio
 *
 * Usage:
 *   npx tsx packages/mcp-model-router/src/index.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { discoverAndAllocate, type AllocationManifest } from "./discover.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(__dirname, "..", "manifest.json");

// ────────────────────────────────────────────────────────────────────
// Manifest helpers
// ────────────────────────────────────────────────────────────────────

function loadManifest(): AllocationManifest | null {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as AllocationManifest;
  } catch {
    return null;
  }
}

function saveManifest(manifest: AllocationManifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  // Also copy to lib/ai/model-manifest.json for Next.js app
  const appManifestPath = path.join(__dirname, "..", "..", "..", "lib", "ai", "model-manifest.json");
  try {
    fs.mkdirSync(path.dirname(appManifestPath), { recursive: true });
    fs.writeFileSync(appManifestPath, JSON.stringify(manifest, null, 2), "utf8");
  } catch {
    // App path may not exist in all environments
  }
}

function isStale(manifest: AllocationManifest): boolean {
  return new Date() >= new Date(manifest.nextEvaluationAt);
}

// ────────────────────────────────────────────────────────────────────
// Server
// ────────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "bidblender-model-router",
  version: "0.2.0",
});

// ── Tool 1: evaluate_models ─────────────────────────────────────────

server.tool(
  "evaluate_models",
  "Query the live OpenAI API to discover available models, score them against all BidBlender tasks, and persist a new allocation manifest. Run this on first setup or to force a re-evaluation.",
  {
    reason: z
      .enum(["manual", "scheduled", "new_models", "new_functionality"])
      .optional()
      .default("manual")
      .describe("Why the evaluation is being triggered"),
    force: z
      .boolean()
      .optional()
      .default(false)
      .describe("Force re-evaluation even if not yet due"),
  },
  async ({ reason, force }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { content: [{ type: "text" as const, text: "❌ OPENAI_API_KEY environment variable is not set." }] };
    }

    const existing = loadManifest();
    if (existing && !force && !isStale(existing) && reason === "manual") {
      const daysLeft = Math.ceil(
        (new Date(existing.nextEvaluationAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        content: [{
          type: "text" as const,
          text: `ℹ️  Manifest is current (next evaluation in ${daysLeft} days). Use force=true to re-evaluate anyway.\n\nLast generated: ${existing.generatedAt}`,
        }],
      };
    }

    const manifest = await discoverAndAllocate(apiKey, reason ?? "manual");
    saveManifest(manifest);

    const lines = [
      `✅ Evaluation complete (trigger: ${reason})`,
      `📦 ${manifest.summary.chatModelsAvailable} chat models found from ${manifest.summary.totalModelsDiscovered} total`,
      `🎯 Allocated ${Object.keys(manifest.allocations).length} tasks`,
      `💰 Estimated monthly cost at 10k jobs: $${manifest.summary.estimatedMonthlyCostAt10kJobs}`,
      `📅 Next evaluation: ${manifest.nextEvaluationAt}`,
      ``,
      `Allocations:`,
      ...Object.values(manifest.allocations).map(
        (a) => `  ${a.taskId.padEnd(35)} → ${a.allocatedModel.padEnd(20)} ($${a.estimatedCostPer1kTokens.toFixed(5)}/1k)`
      ),
    ];

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  }
);

// ── Tool 2: get_allocations ─────────────────────────────────────────

server.tool(
  "get_allocations",
  "Show the current model allocation for every BidBlender task, including costs and fallback models. Warns if the manifest is stale.",
  {
    task_id: z
      .string()
      .optional()
      .describe("Filter to a specific task ID (e.g. STRATEGIC_BID_INTELLIGENCE)"),
  },
  async ({ task_id }) => {
    const manifest = loadManifest();
    if (!manifest) {
      return {
        content: [{
          type: "text" as const,
          text: "❌ No manifest found. Run evaluate_models first.",
        }],
      };
    }

    const staleWarning = isStale(manifest)
      ? `\n⚠️  STALE: Manifest is past its evaluation date (${manifest.nextEvaluationAt}). Run evaluate_models to refresh.\n`
      : `\n✅ Manifest is current (next evaluation: ${manifest.nextEvaluationAt})\n`;

    const allocs = task_id
      ? { [task_id]: manifest.allocations[task_id] }
      : manifest.allocations;

    if (task_id && !manifest.allocations[task_id]) {
      return { content: [{ type: "text" as const, text: `❌ Task "${task_id}" not found in manifest.` }] };
    }

    const lines = [
      `Generated: ${manifest.generatedAt}`,
      `Trigger: ${manifest.triggerReason}`,
      staleWarning,
      `Models in use: ${manifest.summary.allocatedModels.join(", ")}`,
      ``,
    ];

    for (const alloc of Object.values(allocs)) {
      lines.push(`${alloc.taskId}`);
      lines.push(`  Complexity:     ${alloc.complexity}${alloc.requiresReasoning ? " (reasoning)" : ""}`);
      lines.push(`  Allocated:      ${alloc.allocatedModel}`);
      lines.push(`  Fallback:       ${alloc.fallbackModel}`);
      lines.push(`  Cost/1k tokens: $${alloc.estimatedCostPer1kTokens.toFixed(5)}`);
      lines.push(`  Note:           ${alloc.reasoning}`);
      lines.push(``);
    }

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  }
);

// ── Tool 3: recommend_model ─────────────────────────────────────────

server.tool(
  "recommend_model",
  "Get an ad-hoc model recommendation for any task. First checks the manifest, then falls back to scoring logic.",
  {
    task_description: z.string().describe("What the task needs to do"),
    task_id: z.string().optional().describe("Known BidBlender task ID if applicable"),
    complexity: z.enum(["low", "medium", "high"]).optional(),
    requires_reasoning: z.boolean().optional(),
    budget: z.enum(["cheap", "moderate", "unlimited"]).optional(),
  },
  async ({ task_description, task_id, complexity, requires_reasoning, budget }) => {
    const manifest = loadManifest();

    // If we have an exact task match in the manifest, return it
    if (task_id && manifest?.allocations[task_id]) {
      const alloc = manifest.allocations[task_id];
      const stale = manifest ? isStale(manifest) : false;
      return {
        content: [{
          type: "text" as const,
          text: [
            stale ? "⚠️  Note: Manifest may be stale — consider running evaluate_models" : "",
            `Task:      ${task_id}`,
            `Model:     ${alloc.allocatedModel}`,
            `Fallback:  ${alloc.fallbackModel}`,
            `Cost/1k:   $${alloc.estimatedCostPer1kTokens.toFixed(5)}`,
            `Rationale: ${alloc.reasoning}`,
          ].filter(Boolean).join("\n"),
        }],
      };
    }

    // Otherwise derive from available models in manifest
    if (!manifest) {
      return {
        content: [{
          type: "text" as const,
          text: "❌ No manifest found. Run evaluate_models first, then I can give accurate recommendations.",
        }],
      };
    }

    const { discoverAndAllocate: _, BIDBLENDER_TASKS: tasks, ...rest } = await import("./discover.js");
    void rest;

    // Score available models against the ad-hoc task
    const isHighComplexity = complexity === "high" || requires_reasoning === true;
    const isCheap = budget === "cheap";

    const candidates = manifest.availableModels
      .filter((m) => {
        if (isHighComplexity && isCheap) return m.tier === "economy" || m.tier === "balanced";
        if (isHighComplexity) return m.tier === "balanced" || m.tier === "pro" || m.capabilities.reasoning;
        if (isCheap) return m.tier === "nano" || m.tier === "economy";
        return true;
      })
      .sort((a, b) => a.pricing.inputPerMillion - b.pricing.inputPerMillion);

    const best = candidates[0];
    if (!best) {
      return { content: [{ type: "text" as const, text: "❌ No suitable model found." }] };
    }

    return {
      content: [{
        type: "text" as const,
        text: [
          `Task:      ${task_description}`,
          `Model:     ${best.id}`,
          `Family:    ${best.family}`,
          `Tier:      ${best.tier}`,
          `Reasoning: ${best.capabilities.reasoning ? "yes" : "no"}`,
          `Context:   ${(best.capabilities.contextWindow / 1000).toFixed(0)}k tokens`,
          `Cost:      $${best.pricing.inputPerMillion}/$${best.pricing.outputPerMillion} per 1M tokens`,
        ].join("\n"),
      }],
    };
  }
);

// ── Tool 4: get_manifest_status ─────────────────────────────────────

server.tool(
  "get_manifest_status",
  "Check the current state of the model allocation manifest — when it was generated, when re-evaluation is due, and what changed since last run.",
  {},
  async () => {
    const manifest = loadManifest();
    if (!manifest) {
      return {
        content: [{
          type: "text" as const,
          text: "❌ No manifest found.\n\nRun evaluate_models to generate one. This will:\n  1. Query the live OpenAI API for all available models\n  2. Score each model against all BidBlender tasks\n  3. Allocate the most cost-effective model to each task\n  4. Store the manifest for the app to read at runtime",
        }],
      };
    }

    const stale = isStale(manifest);
    const daysUntil = Math.ceil(
      (new Date(manifest.nextEvaluationAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const lines = [
      stale ? "🔴 STATUS: STALE — re-evaluation needed" : `🟢 STATUS: Current (next evaluation in ${daysUntil} days)`,
      ``,
      `Generated:        ${manifest.generatedAt}`,
      `Next evaluation:  ${manifest.nextEvaluationAt}`,
      `Trigger:          ${manifest.triggerReason}`,
      ``,
      `Models discovered: ${manifest.summary.totalModelsDiscovered}`,
      `Chat-capable:      ${manifest.summary.chatModelsAvailable}`,
      `In active use:     ${manifest.summary.allocatedModels.join(", ")}`,
      `Est. monthly cost: $${manifest.summary.estimatedMonthlyCostAt10kJobs} (at 10k jobs/mo)`,
      ``,
      `Re-evaluation triggers:`,
      `  • Automatic every 2 weeks via GitHub Actions`,
      `  • On push to lib/ai/constants.ts or lib/ai/types.ts (new tasks added)`,
      `  • Via \`evaluate_models\` tool with reason=new_models`,
      `  • Via \`npx tsx scripts/evaluate-models.ts --scheduled\``,
    ];

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  }
);

// ────────────────────────────────────────────────────────────────────
// Start
// ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BidBlender Model Router v0.2.0 — stdio transport ready");

  const manifest = loadManifest();
  if (!manifest) {
    console.error("⚠️  No manifest found. Call evaluate_models to generate one.");
  } else if (isStale(manifest)) {
    console.error(`⚠️  Manifest is stale (was due: ${manifest.nextEvaluationAt}). Call evaluate_models.`);
  } else {
    console.error(`✅ Manifest loaded — ${Object.keys(manifest.allocations).length} tasks allocated.`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
