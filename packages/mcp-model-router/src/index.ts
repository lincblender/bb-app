/**
 * BidBlender MCP Model Router
 *
 * An MCP server that exposes two tools:
 *   1. list_models — returns the full model registry with capabilities & pricing
 *   2. recommend_model — scores models against a task and returns a recommendation
 *
 * Transport: stdio (runs as a subprocess for Cursor, Claude Desktop, etc.)
 *
 * Usage:
 *   npx tsx packages/mcp-model-router/src/index.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  getAvailableModels,
  getModelById,
  getModelsByTier,
  type ModelTier,
} from "./registry.js";
import { recommendModel } from "./recommend.js";

// ────────────────────────────────────────────────────────────────────
// Server setup
// ────────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "bidblender-model-router",
  version: "0.1.0",
});

// ────────────────────────────────────────────────────────────────────
// Tool 1: list_models
// ────────────────────────────────────────────────────────────────────

server.tool(
  "list_models",
  "List all available OpenAI models with capabilities, pricing, and suitability tags. Optionally filter by tier.",
  {
    tier: z
      .enum(["nano", "economy", "balanced", "deep", "reasoning"])
      .optional()
      .describe("Filter by model tier"),
    model_id: z
      .string()
      .optional()
      .describe("Get details for a specific model ID"),
  },
  async ({ tier, model_id }) => {
    if (model_id) {
      const model = getModelById(model_id);
      if (!model) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Model "${model_id}" not found in registry.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(model, null, 2),
          },
        ],
      };
    }

    const models = tier
      ? getModelsByTier(tier as ModelTier)
      : getAvailableModels();

    const summary = models.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      tier: m.tier,
      reasoning: m.capabilities.reasoning,
      contextWindow: m.capabilities.contextWindow,
      inputCostPerMillion: m.pricing.inputPerMillion,
      outputCostPerMillion: m.pricing.outputPerMillion,
      bestFor: m.bestFor,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }
);

// ────────────────────────────────────────────────────────────────────
// Tool 2: recommend_model
// ────────────────────────────────────────────────────────────────────

server.tool(
  "recommend_model",
  "Given a task description and constraints, recommend the best OpenAI model. Returns a scored ranking with reasoning.",
  {
    task: z
      .string()
      .describe("Description of the task to perform"),
    paradigm: z
      .string()
      .optional()
      .describe("BidBlender paradigm (e.g. STRATEGIC_BID_INTELLIGENCE, LOW_COST_EXTRACTION)"),
    analysis_type: z
      .string()
      .optional()
      .describe("BidBlender analysis type (e.g. RECOMMEND_BID_DECISION, EXTRACT_METADATA)"),
    complexity: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Task complexity"),
    requires_reasoning: z
      .boolean()
      .optional()
      .describe("Whether multi-step chain-of-thought reasoning is needed"),
    requires_structured_output: z
      .boolean()
      .optional()
      .describe("Whether the response must be structured JSON"),
    requires_vision: z
      .boolean()
      .optional()
      .describe("Whether the task includes image inputs"),
    estimated_input_tokens: z
      .number()
      .optional()
      .describe("Approximate input size in tokens"),
    budget_constraint: z
      .enum(["cheap", "moderate", "unlimited"])
      .optional()
      .describe("Budget preference"),
  },
  async (params) => {
    const result = recommendModel({
      task: params.task,
      paradigm: params.paradigm,
      analysisType: params.analysis_type,
      complexity: params.complexity,
      requiresReasoning: params.requires_reasoning,
      requiresStructuredOutput: params.requires_structured_output,
      requiresVision: params.requires_vision,
      estimatedInputTokens: params.estimated_input_tokens,
      budgetConstraint: params.budget_constraint,
    });

    const output = [
      result.reasoning,
      "",
      "───── Alternatives ─────",
      ...result.alternatives.map(
        (alt, i) =>
          `${i + 1}. ${alt.model.displayName} (${alt.model.id}) — score: ${alt.score} — $${alt.estimatedCostPer1kTokens.toFixed(5)}/1k tokens`
      ),
    ].join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: output,
        },
      ],
    };
  }
);

// ────────────────────────────────────────────────────────────────────
// Tool 3: get_paradigm_model_map
// ────────────────────────────────────────────────────────────────────

server.tool(
  "get_paradigm_model_map",
  "Returns a mapping of BidBlender paradigms to their recommended models at each budget level.",
  {},
  async () => {
    const paradigms = [
      "LOW_COST_EXTRACTION",
      "OPPORTUNITY_INTELLIGENCE",
      "COMPANY_FIT",
      "NETWORK_INFLUENCE",
      "COMPETITIVE_LANDSCAPE",
      "STRATEGIC_BID_INTELLIGENCE",
      "CROSS_OPPORTUNITY_INTELLIGENCE",
      "ADDENDA_CHANGE_ANALYSIS",
      "KNOWLEDGE_BASE_INTELLIGENCE",
    ];

    const map: Record<string, Record<string, string>> = {};

    for (const paradigm of paradigms) {
      map[paradigm] = {};
      for (const budget of ["cheap", "moderate", "unlimited"] as const) {
        const result = recommendModel({
          task: `Run ${paradigm} analysis`,
          paradigm,
          budgetConstraint: budget,
          requiresStructuredOutput: true,
          complexity:
            paradigm === "LOW_COST_EXTRACTION"
              ? "low"
              : paradigm.includes("STRATEGIC") || paradigm.includes("CROSS")
                ? "high"
                : "medium",
          requiresReasoning:
            paradigm.includes("STRATEGIC") || paradigm.includes("CROSS"),
        });
        map[paradigm][budget] = `${result.recommended.model.id} (score: ${result.recommended.score})`;
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(map, null, 2),
        },
      ],
    };
  }
);

// ────────────────────────────────────────────────────────────────────
// Start
// ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BidBlender Model Router MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
