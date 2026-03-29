/**
 * Model Discovery — Queries the live OpenAI API for available models,
 * enriches them with capability/pricing metadata, evaluates them
 * against BidBlender tasks, and writes an allocation file.
 *
 * This is the engine that makes model selection truly dynamic.
 */

import OpenAI from "openai";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface DiscoveredModel {
  id: string;
  owned_by: string;
  created: number;
  capabilities: {
    chat: boolean;
    reasoning: boolean;
    vision: boolean;
    structuredOutput: boolean;
    functionCalling: boolean;
    contextWindow: number;
    maxOutputTokens: number;
  };
  pricing: {
    inputPerMillion: number;
    outputPerMillion: number;
    cachedInputPerMillion?: number;
  };
  family: string;
  tier: "nano" | "economy" | "balanced" | "pro" | "reasoning";
  /** Whether this is a dated snapshot vs the latest alias */
  isSnapshot: boolean;
}

export interface TaskAllocation {
  taskId: string;
  description: string;
  complexity: "low" | "medium" | "high";
  requiresReasoning: boolean;
  allocatedModel: string;
  fallbackModel: string;
  score: number;
  estimatedCostPer1kTokens: number;
  reasoning: string;
}

export interface AllocationManifest {
  generatedAt: string;
  nextEvaluationAt: string;
  triggerReason: "scheduled" | "new_models" | "new_functionality" | "manual";
  availableModels: DiscoveredModel[];
  allocations: Record<string, TaskAllocation>;
  summary: {
    totalModelsDiscovered: number;
    chatModelsAvailable: number;
    allocatedModels: string[];
    estimatedMonthlyCostAt10kJobs: number;
  };
}

// ────────────────────────────────────────────────────────────────────
// Known model metadata (enrichment layer)
//
// The OpenAI /v1/models endpoint returns only id, owned_by, created.
// We enrich with known capability/pricing data. Models not in this
// table get sensible defaults based on their family name.
// ────────────────────────────────────────────────────────────────────

interface ModelMeta {
  chat: boolean;
  reasoning: boolean;
  vision: boolean;
  structuredOutput: boolean;
  functionCalling: boolean;
  contextWindow: number;
  maxOutputTokens: number;
  inputPerMillion: number;
  outputPerMillion: number;
  cachedInputPerMillion?: number;
  tier: DiscoveredModel["tier"];
}

const KNOWN_MODELS: Record<string, ModelMeta> = {
  // ── GPT-5.4 family (current flagship, March 2026) ──────────────
  "gpt-5.4": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 272_000, maxOutputTokens: 32_768,
    inputPerMillion: 2.50, outputPerMillion: 15.00, cachedInputPerMillion: 0.25,
    tier: "balanced",
  },
  "gpt-5.4-mini": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 272_000, maxOutputTokens: 16_384,
    inputPerMillion: 0.75, outputPerMillion: 4.50, cachedInputPerMillion: 0.075,
    tier: "economy",
  },
  "gpt-5.4-nano": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 128_000, maxOutputTokens: 8_192,
    inputPerMillion: 0.20, outputPerMillion: 1.25, cachedInputPerMillion: 0.02,
    tier: "nano",
  },
  "gpt-5.4-pro": {
    chat: true, reasoning: true, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 272_000, maxOutputTokens: 65_536,
    inputPerMillion: 30.00, outputPerMillion: 180.00,
    tier: "pro",
  },

  // ── GPT-5 / 5.1 / 5.2 (legacy, still available) ───────────────
  "gpt-5": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 128_000, maxOutputTokens: 16_384,
    inputPerMillion: 2.00, outputPerMillion: 8.00,
    tier: "balanced",
  },
  "gpt-5-mini": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 128_000, maxOutputTokens: 16_384,
    inputPerMillion: 0.50, outputPerMillion: 3.00,
    tier: "economy",
  },
  "gpt-5-nano": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 128_000, maxOutputTokens: 8_192,
    inputPerMillion: 0.10, outputPerMillion: 0.60,
    tier: "nano",
  },
  "gpt-5-pro": {
    chat: true, reasoning: true, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 128_000, maxOutputTokens: 32_768,
    inputPerMillion: 15.00, outputPerMillion: 90.00,
    tier: "pro",
  },
  "gpt-5.1": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 200_000, maxOutputTokens: 32_768,
    inputPerMillion: 2.00, outputPerMillion: 10.00,
    tier: "balanced",
  },
  "gpt-5.2": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 200_000, maxOutputTokens: 32_768,
    inputPerMillion: 2.00, outputPerMillion: 10.00,
    tier: "balanced",
  },
  "gpt-5.2-pro": {
    chat: true, reasoning: true, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 200_000, maxOutputTokens: 65_536,
    inputPerMillion: 20.00, outputPerMillion: 120.00,
    tier: "pro",
  },

  // ── GPT-4.1 family ─────────────────────────────────────────────
  "gpt-4.1": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 1_047_576, maxOutputTokens: 32_768,
    inputPerMillion: 2.00, outputPerMillion: 8.00, cachedInputPerMillion: 0.50,
    tier: "balanced",
  },
  "gpt-4.1-mini": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 1_047_576, maxOutputTokens: 32_768,
    inputPerMillion: 0.40, outputPerMillion: 1.60, cachedInputPerMillion: 0.10,
    tier: "economy",
  },
  "gpt-4.1-nano": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 1_047_576, maxOutputTokens: 32_768,
    inputPerMillion: 0.10, outputPerMillion: 0.40, cachedInputPerMillion: 0.025,
    tier: "nano",
  },

  // ── GPT-4o family ──────────────────────────────────────────────
  "gpt-4o": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 128_000, maxOutputTokens: 16_384,
    inputPerMillion: 2.50, outputPerMillion: 10.00, cachedInputPerMillion: 1.25,
    tier: "balanced",
  },
  "gpt-4o-mini": {
    chat: true, reasoning: false, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 128_000, maxOutputTokens: 16_384,
    inputPerMillion: 0.15, outputPerMillion: 0.60, cachedInputPerMillion: 0.075,
    tier: "economy",
  },

  // ── o-series (reasoning) ───────────────────────────────────────
  "o3": {
    chat: true, reasoning: true, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 200_000, maxOutputTokens: 100_000,
    inputPerMillion: 2.00, outputPerMillion: 8.00, cachedInputPerMillion: 0.50,
    tier: "reasoning",
  },
  "o3-mini": {
    chat: true, reasoning: true, vision: false, structuredOutput: true, functionCalling: true,
    contextWindow: 200_000, maxOutputTokens: 100_000,
    inputPerMillion: 1.10, outputPerMillion: 4.40, cachedInputPerMillion: 0.55,
    tier: "reasoning",
  },
  "o4-mini": {
    chat: true, reasoning: true, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 200_000, maxOutputTokens: 100_000,
    inputPerMillion: 1.10, outputPerMillion: 4.40, cachedInputPerMillion: 0.275,
    tier: "reasoning",
  },
  "o1": {
    chat: true, reasoning: true, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 200_000, maxOutputTokens: 100_000,
    inputPerMillion: 15.00, outputPerMillion: 60.00, cachedInputPerMillion: 7.50,
    tier: "reasoning",
  },
  "o1-pro": {
    chat: true, reasoning: true, vision: true, structuredOutput: true, functionCalling: true,
    contextWindow: 200_000, maxOutputTokens: 100_000,
    inputPerMillion: 150.00, outputPerMillion: 600.00,
    tier: "pro",
  },
};

// Models to exclude from chat evaluation
const EXCLUDE_PREFIXES = [
  "dall-e", "tts-", "whisper-", "text-embedding-", "babbage-", "davinci-",
  "omni-moderation", "gpt-image-", "sora-", "gpt-audio", "gpt-realtime",
  "gpt-4o-audio", "gpt-4o-mini-audio", "gpt-4o-realtime", "gpt-4o-mini-realtime",
  "gpt-4o-transcribe", "gpt-4o-mini-transcribe", "gpt-4o-mini-tts",
  "gpt-4o-search", "gpt-4o-mini-search", "gpt-5-search",
  "chatgpt-image",
];

function shouldExclude(id: string): boolean {
  return EXCLUDE_PREFIXES.some((p) => id.startsWith(p));
}

function isDateSnapshot(id: string): boolean {
  return /\d{4}-\d{2}-\d{2}/.test(id);
}

function detectFamily(id: string): string {
  if (id.startsWith("gpt-5.4")) return "gpt-5.4";
  if (id.startsWith("gpt-5.3")) return "gpt-5.3";
  if (id.startsWith("gpt-5.2")) return "gpt-5.2";
  if (id.startsWith("gpt-5.1")) return "gpt-5.1";
  if (id.startsWith("gpt-5")) return "gpt-5";
  if (id.startsWith("gpt-4.1")) return "gpt-4.1";
  if (id.startsWith("gpt-4o-mini")) return "gpt-4o-mini";
  if (id.startsWith("gpt-4o")) return "gpt-4o";
  if (id.startsWith("gpt-4")) return "gpt-4";
  if (id.startsWith("o4")) return "o4";
  if (id.startsWith("o3")) return "o3";
  if (id.startsWith("o1")) return "o1";
  return "unknown";
}

function inferTier(id: string): DiscoveredModel["tier"] {
  if (id.includes("-pro")) return "pro";
  if (id.includes("-nano")) return "nano";
  if (id.includes("-mini")) return "economy";
  if (id.startsWith("o")) return "reasoning";
  return "balanced";
}

function enrichModel(id: string, ownedBy: string, created: number): DiscoveredModel | null {
  if (shouldExclude(id)) return null;

  // Find best metadata match: exact id first, then base model name
  const baseId = id.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  const meta = KNOWN_MODELS[id] ?? KNOWN_MODELS[baseId];

  if (meta && !meta.chat) return null;

  const family = detectFamily(id);
  const snapshot = isDateSnapshot(id);

  // If we have known metadata, use it
  if (meta) {
    return {
      id,
      owned_by: ownedBy,
      created,
      capabilities: {
        chat: true,
        reasoning: meta.reasoning,
        vision: meta.vision,
        structuredOutput: meta.structuredOutput,
        functionCalling: meta.functionCalling,
        contextWindow: meta.contextWindow,
        maxOutputTokens: meta.maxOutputTokens,
      },
      pricing: {
        inputPerMillion: meta.inputPerMillion,
        outputPerMillion: meta.outputPerMillion,
        cachedInputPerMillion: meta.cachedInputPerMillion,
      },
      family,
      tier: meta.tier,
      isSnapshot: snapshot,
    };
  }

  // Unknown model — infer from naming patterns
  const tier = inferTier(id);
  return {
    id,
    owned_by: ownedBy,
    created,
    capabilities: {
      chat: true,
      reasoning: id.startsWith("o") || id.includes("-pro"),
      vision: true,
      structuredOutput: true,
      functionCalling: true,
      contextWindow: 128_000,
      maxOutputTokens: 16_384,
    },
    pricing: {
      inputPerMillion: tier === "nano" ? 0.20 : tier === "economy" ? 0.75 : tier === "pro" ? 30.0 : 2.50,
      outputPerMillion: tier === "nano" ? 1.25 : tier === "economy" ? 4.50 : tier === "pro" ? 180.0 : 15.0,
    },
    family,
    tier,
    isSnapshot: snapshot,
  };
}

// ────────────────────────────────────────────────────────────────────
// BidBlender task definitions
// ────────────────────────────────────────────────────────────────────

interface BidBlenderTask {
  id: string;
  description: string;
  complexity: "low" | "medium" | "high";
  requiresReasoning: boolean;
  /** Prefer models with these traits */
  preferLargeContext: boolean;
  /** Typical input size in tokens */
  typicalInputTokens: number;
}

const BIDBLENDER_TASKS: BidBlenderTask[] = [
  {
    id: "LOW_COST_EXTRACTION",
    description: "Extract structured metadata from tender documents",
    complexity: "low", requiresReasoning: false,
    preferLargeContext: false, typicalInputTokens: 4_000,
  },
  {
    id: "OPPORTUNITY_INTELLIGENCE",
    description: "Assess opportunity complexity, size signals, procurement behaviour",
    complexity: "medium", requiresReasoning: false,
    preferLargeContext: false, typicalInputTokens: 8_000,
  },
  {
    id: "COMPANY_FIT",
    description: "Score technical fit and identify capability gaps against tender requirements",
    complexity: "medium", requiresReasoning: false,
    preferLargeContext: false, typicalInputTokens: 12_000,
  },
  {
    id: "NETWORK_INFLUENCE",
    description: "Evaluate relationship density and decision-maker proximity",
    complexity: "medium", requiresReasoning: false,
    preferLargeContext: false, typicalInputTokens: 8_000,
  },
  {
    id: "COMPETITIVE_LANDSCAPE",
    description: "Identify competitors, incumbent advantage, estimate win probability",
    complexity: "medium", requiresReasoning: false,
    preferLargeContext: false, typicalInputTokens: 10_000,
  },
  {
    id: "STRATEGIC_BID_INTELLIGENCE",
    description: "Full bid/no-bid strategic decision with 5-dimension analysis",
    complexity: "high", requiresReasoning: true,
    preferLargeContext: false, typicalInputTokens: 20_000,
  },
  {
    id: "CROSS_OPPORTUNITY_INTELLIGENCE",
    description: "Compare and rank multiple opportunities for portfolio optimisation",
    complexity: "high", requiresReasoning: true,
    preferLargeContext: true, typicalInputTokens: 40_000,
  },
  {
    id: "ADDENDA_CHANGE_ANALYSIS",
    description: "Detect and assess impact of document changes between versions",
    complexity: "medium", requiresReasoning: false,
    preferLargeContext: true, typicalInputTokens: 30_000,
  },
  {
    id: "KNOWLEDGE_BASE_INTELLIGENCE",
    description: "Match opportunity needs to reusable internal content and case studies",
    complexity: "low", requiresReasoning: false,
    preferLargeContext: false, typicalInputTokens: 8_000,
  },
  {
    id: "DOCUMENT_ANALYSIS_CHAT",
    description: "User-initiated chat about uploaded documents with grounded responses",
    complexity: "medium", requiresReasoning: false,
    preferLargeContext: true, typicalInputTokens: 15_000,
  },
];

// ────────────────────────────────────────────────────────────────────
// Scoring engine
// ────────────────────────────────────────────────────────────────────

function scoreModelForTask(model: DiscoveredModel, task: BidBlenderTask): number {
  let score = 0;

  // 0. Hard gates — disqualify unsuitable models outright
  //    (return very low score so they never get allocated)
  if (task.complexity === "high" && (model.tier === "nano")) {
    return -100; // nano models cannot handle high-complexity tasks
  }
  if (task.requiresReasoning && model.tier === "nano") {
    return -100;
  }
  // Exclude codex/chat-latest/search variants — not stable API targets
  if (model.id.includes("codex") || model.id.includes("chat-latest") || model.id.includes("search")) {
    return -100;
  }

  // 1. Complexity alignment (25 pts max) — match tier to task
  if (task.complexity === "low") {
    if (model.tier === "nano") score += 25;
    else if (model.tier === "economy") score += 15;
    else if (model.tier === "balanced") score += 0;  // acceptable but not ideal
    else score -= 10; // pro/reasoning is waste for low complexity
  } else if (task.complexity === "medium") {
    if (model.tier === "economy") score += 20;
    else if (model.tier === "balanced") score += 25;
    else if (model.tier === "nano") score -= 10;
    else if (model.tier === "pro" || model.tier === "reasoning") score -= 5; // slight overkill
  } else {
    // high complexity
    if (model.tier === "balanced") score += 20;
    else if (model.tier === "pro") score += 15;  // great but expensive
    else if (model.tier === "economy") score += 5; // acceptable with caveats
    else if (model.tier === "reasoning") score += 10; // reasoning is useful here
  }

  // 2. Reasoning requirement (20 pts)
  if (task.requiresReasoning) {
    if (model.capabilities.reasoning) score += 20;
    // Non-reasoning models for reasoning tasks get a modest penalty
    // (some GPT-5 models can reason well without explicit CoT)
    else if (model.tier === "balanced") score -= 5;
    else score -= 15;
  }

  // 3. Cost effectiveness (20 pts) — secondary to quality for high complexity
  const costPer1k = (model.pricing.inputPerMillion + model.pricing.outputPerMillion) / 1000;
  const costBudget = task.complexity === "low" ? 0.003 : task.complexity === "medium" ? 0.008 : 0.020;
  if (costPer1k <= costBudget * 0.5) score += 20;      // well under budget
  else if (costPer1k <= costBudget) score += 10;        // within budget
  else if (costPer1k <= costBudget * 3) score += 0;     // over but acceptable
  else score -= 10;                                      // significantly over budget

  // 4. Context window fit (hard penalty if too small)
  if (task.typicalInputTokens > model.capabilities.contextWindow * 0.7) {
    score -= 40;
  }
  if (task.preferLargeContext && model.capabilities.contextWindow >= 200_000) {
    score += 10;
  }

  // 5. Structured output (required for all BidBlender tasks)
  if (!model.capabilities.structuredOutput) return -100;

  // 6. Prefer latest generation within same tier
  if (model.family === "gpt-5.4") score += 8;
  else if (model.family.startsWith("gpt-5")) score += 5;
  else if (model.family === "gpt-4.1") score += 3;

  // 7. Prefer non-snapshot aliases (use gpt-5.4 not gpt-5.4-2026-03-05)
  if (model.isSnapshot) score -= 5;

  return Math.round(score * 10) / 10;
}

function allocateTask(task: BidBlenderTask, models: DiscoveredModel[]): TaskAllocation {
  const scored = models
    .map((m) => ({ model: m, score: scoreModelForTask(m, task) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const fallback = scored.find((s) => s.model.id !== best.model.id && s.score > 0) ?? scored[1];
  const costPer1k = (best.model.pricing.inputPerMillion + best.model.pricing.outputPerMillion) / 1000;

  return {
    taskId: task.id,
    description: task.description,
    complexity: task.complexity,
    requiresReasoning: task.requiresReasoning,
    allocatedModel: best.model.id,
    fallbackModel: fallback?.model.id ?? best.model.id,
    score: best.score,
    estimatedCostPer1kTokens: Math.round(costPer1k * 100_000) / 100_000,
    reasoning: `Selected ${best.model.id} (${best.model.tier}, $${best.model.pricing.inputPerMillion}/$${best.model.pricing.outputPerMillion} per 1M tokens). ` +
      `Score: ${best.score}. Fallback: ${fallback?.model.id ?? "none"}.`,
  };
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export async function discoverAndAllocate(
  apiKey: string,
  triggerReason: AllocationManifest["triggerReason"] = "manual"
): Promise<AllocationManifest> {
  // 1. Query OpenAI for available models
  const openai = new OpenAI({ apiKey });
  const response = await openai.models.list();
  const rawModels: Array<{ id: string; owned_by: string; created: number }> = [];
  for await (const model of response) {
    rawModels.push({ id: model.id, owned_by: model.owned_by, created: model.created });
  }

  // 2. Enrich and filter to chat-capable models
  const chatModels = rawModels
    .map((m) => enrichModel(m.id, m.owned_by, m.created))
    .filter((m): m is DiscoveredModel => m !== null)
    .sort((a, b) => a.pricing.inputPerMillion - b.pricing.inputPerMillion);

  // 3. Allocate each BidBlender task to the best model
  const allocations: Record<string, TaskAllocation> = {};
  for (const task of BIDBLENDER_TASKS) {
    allocations[task.id] = allocateTask(task, chatModels);
  }

  // 4. Build summary
  const allocatedModelIds = [...new Set(Object.values(allocations).map((a) => a.allocatedModel))];
  const avgCost = Object.values(allocations).reduce((sum, a) => sum + a.estimatedCostPer1kTokens, 0) / Object.keys(allocations).length;

  const now = new Date();
  const nextEval = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks

  return {
    generatedAt: now.toISOString(),
    nextEvaluationAt: nextEval.toISOString(),
    triggerReason,
    availableModels: chatModels,
    allocations,
    summary: {
      totalModelsDiscovered: rawModels.length,
      chatModelsAvailable: chatModels.length,
      allocatedModels: allocatedModelIds,
      estimatedMonthlyCostAt10kJobs: Math.round(avgCost * 5 * 10_000 * 100) / 100, // ~5k tokens avg per job
    },
  };
}

export { BIDBLENDER_TASKS };
