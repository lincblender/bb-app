/**
 * Model Router — Dynamic model selection for BidBlender AI jobs
 *
 * Replaces the static MODEL_BY_PROFILE map with intelligent selection
 * based on paradigm, complexity, and budget constraints.
 *
 * The registry and scoring logic mirror packages/mcp-model-router
 * but are self-contained here for runtime use within the Next.js app.
 */

import type { ModelProfile, Paradigm } from "./types";

// ────────────────────────────────────────────────────────────────────
// Model registry (mirrors packages/mcp-model-router/src/registry.ts)
// ────────────────────────────────────────────────────────────────────

export type ModelTier = "nano" | "economy" | "balanced" | "deep" | "reasoning";

export interface ModelEntry {
  id: string;
  displayName: string;
  tier: ModelTier;
  /** Does the model support chain-of-thought reasoning? */
  reasoning: boolean;
  /** Maximum context window (tokens) */
  contextWindow: number;
  /** USD per 1M input tokens */
  inputPerMillion: number;
  /** USD per 1M output tokens */
  outputPerMillion: number;
  /** Paradigms this model excels at */
  bestFor: string[];
}

const REGISTRY: ModelEntry[] = [
  {
    id: "gpt-4.1-nano",
    displayName: "GPT-4.1 Nano",
    tier: "nano",
    reasoning: false,
    contextWindow: 1_047_576,
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
    bestFor: ["LOW_COST_EXTRACTION", "intent_routing", "formatting"],
  },
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    tier: "economy",
    reasoning: false,
    contextWindow: 128_000,
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
    bestFor: [
      "LOW_COST_EXTRACTION",
      "CLASSIFY_OPPORTUNITY_TYPE",
      "EXTRACT_METADATA",
      "simple_classification",
    ],
  },
  {
    id: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    tier: "economy",
    reasoning: false,
    contextWindow: 1_047_576,
    inputPerMillion: 0.40,
    outputPerMillion: 1.60,
    bestFor: [
      "LOW_COST_EXTRACTION",
      "OPPORTUNITY_INTELLIGENCE",
      "CLASSIFY_OPPORTUNITY_TYPE",
      "general_analysis",
    ],
  },
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    tier: "balanced",
    reasoning: false,
    contextWindow: 128_000,
    inputPerMillion: 2.50,
    outputPerMillion: 10.0,
    bestFor: [
      "OPPORTUNITY_INTELLIGENCE",
      "COMPANY_FIT",
      "NETWORK_INFLUENCE",
      "COMPETITIVE_LANDSCAPE",
      "general_analysis",
    ],
  },
  {
    id: "gpt-4.1",
    displayName: "GPT-4.1",
    tier: "balanced",
    reasoning: false,
    contextWindow: 1_047_576,
    inputPerMillion: 2.00,
    outputPerMillion: 8.0,
    bestFor: [
      "OPPORTUNITY_INTELLIGENCE",
      "COMPANY_FIT",
      "NETWORK_INFLUENCE",
      "document_analysis",
      "long_context",
    ],
  },
  {
    id: "o3-mini",
    displayName: "o3-mini",
    tier: "deep",
    reasoning: true,
    contextWindow: 200_000,
    inputPerMillion: 1.10,
    outputPerMillion: 4.40,
    bestFor: [
      "STRATEGIC_BID_INTELLIGENCE",
      "COMPETITIVE_LANDSCAPE",
      "ANALYSE_CONTRACT_RISK",
      "moderate_reasoning",
    ],
  },
  {
    id: "o4-mini",
    displayName: "o4-mini",
    tier: "deep",
    reasoning: true,
    contextWindow: 200_000,
    inputPerMillion: 1.10,
    outputPerMillion: 4.40,
    bestFor: [
      "STRATEGIC_BID_INTELLIGENCE",
      "COMPETITIVE_LANDSCAPE",
      "ANALYSE_CONTRACT_RISK",
      "tool_use_reasoning",
    ],
  },
  {
    id: "o3",
    displayName: "o3",
    tier: "reasoning",
    reasoning: true,
    contextWindow: 200_000,
    inputPerMillion: 2.00,
    outputPerMillion: 8.00,
    bestFor: [
      "STRATEGIC_BID_INTELLIGENCE",
      "RECOMMEND_BID_DECISION",
      "GENERATE_BID_STRATEGY",
      "CROSS_OPPORTUNITY_INTELLIGENCE",
      "complex_reasoning",
    ],
  },
];

// ────────────────────────────────────────────────────────────────────
// Paradigm → complexity mapping
// ────────────────────────────────────────────────────────────────────

const PARADIGM_COMPLEXITY: Record<Paradigm, "low" | "medium" | "high"> = {
  LOW_COST_EXTRACTION: "low",
  OPPORTUNITY_INTELLIGENCE: "medium",
  COMPANY_FIT: "medium",
  NETWORK_INFLUENCE: "medium",
  COMPETITIVE_LANDSCAPE: "medium",
  STRATEGIC_BID_INTELLIGENCE: "high",
  CROSS_OPPORTUNITY_INTELLIGENCE: "high",
  ADDENDA_CHANGE_ANALYSIS: "medium",
  KNOWLEDGE_BASE_INTELLIGENCE: "low",
};

const PARADIGM_NEEDS_REASONING: Set<Paradigm> = new Set([
  "STRATEGIC_BID_INTELLIGENCE",
  "CROSS_OPPORTUNITY_INTELLIGENCE",
]);

// ────────────────────────────────────────────────────────────────────
// Profile → budget mapping
// ────────────────────────────────────────────────────────────────────

const PROFILE_BUDGET: Record<ModelProfile, "cheap" | "moderate" | "unlimited"> = {
  economy: "cheap",
  balanced: "moderate",
  deep: "unlimited",
};

// ────────────────────────────────────────────────────────────────────
// Quality weights per tier (used as a baseline)
// ────────────────────────────────────────────────────────────────────

const TIER_QUALITY: Record<ModelTier, number> = {
  nano: 20,
  economy: 40,
  balanced: 70,
  deep: 85,
  reasoning: 95,
};

// ────────────────────────────────────────────────────────────────────
// Scoring
// ────────────────────────────────────────────────────────────────────

interface ScoredModel {
  model: ModelEntry;
  score: number;
}

function scoreModel(
  model: ModelEntry,
  paradigm: Paradigm,
  complexity: "low" | "medium" | "high",
  budget: "cheap" | "moderate" | "unlimited",
  needsReasoning: boolean,
  estimatedInputTokens: number
): ScoredModel {
  let score = 0;

  // 1. Paradigm match (strong signal)
  if (model.bestFor.includes(paradigm)) {
    score += 25;
  }

  // 2. Complexity alignment
  if (complexity === "low") {
    if (model.tier === "nano" || model.tier === "economy") score += 20;
  } else if (complexity === "medium") {
    if (model.tier === "balanced" || model.tier === "economy") score += 15;
  } else {
    if (model.tier === "deep" || model.tier === "reasoning") score += 25;
  }

  // 3. Reasoning
  if (needsReasoning) {
    score += model.reasoning ? 20 : -15;
  }

  // 4. Context window fit
  if (estimatedInputTokens > model.contextWindow * 0.8) {
    score -= 30;
  } else if (estimatedInputTokens > 100_000 && model.contextWindow >= 1_000_000) {
    score += 10;
  }

  // 5. Budget
  const costPer1k = (model.inputPerMillion + model.outputPerMillion) / 1000;
  if (budget === "cheap") {
    score += costPer1k <= 0.002 ? 15 : costPer1k > 0.01 ? -15 : 0;
  } else if (budget === "unlimited") {
    score += TIER_QUALITY[model.tier] * 0.2;
  }

  // 6. Quality baseline
  score += TIER_QUALITY[model.tier] * 0.1;

  return { model, score: Math.round(score * 10) / 10 };
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export interface ModelSelection {
  modelId: string;
  displayName: string;
  tier: ModelTier;
  reasoning: boolean;
  temperature: number;
  /** Reasoning effort for o-series models */
  reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Select the best model for a given analysis job.
 *
 * Uses the paradigm, model_profile, and optional env overrides to
 * pick the optimal model from the registry.
 */
export function selectModel(
  paradigm: Paradigm,
  modelProfile: ModelProfile,
  opts?: {
    /** Explicit model override (from request or env) */
    modelOverride?: string | null;
    /** Approximate input token count */
    estimatedInputTokens?: number;
  }
): ModelSelection {
  // 1. Honour explicit overrides
  const override = opts?.modelOverride;
  if (override) {
    const entry = REGISTRY.find((m) => m.id === override);
    return {
      modelId: override,
      displayName: entry?.displayName ?? override,
      tier: entry?.tier ?? "balanced",
      reasoning: entry?.reasoning ?? false,
      temperature: modelProfile === "deep" ? 0.3 : 0.2,
      reasoningEffort: entry?.reasoning ? profileToReasoningEffort(modelProfile) : undefined,
    };
  }

  // 2. Score all models and pick the best
  const complexity = PARADIGM_COMPLEXITY[paradigm] ?? "medium";
  const budget = PROFILE_BUDGET[modelProfile] ?? "moderate";
  const needsReasoning = PARADIGM_NEEDS_REASONING.has(paradigm);
  const inputTokens = opts?.estimatedInputTokens ?? 4000;

  const scored = REGISTRY
    .map((m) => scoreModel(m, paradigm, complexity, budget, needsReasoning, inputTokens))
    .sort((a, b) => b.score - a.score);

  const best = scored[0].model;

  return {
    modelId: best.id,
    displayName: best.displayName,
    tier: best.tier,
    reasoning: best.reasoning,
    temperature: best.reasoning ? 1 : modelProfile === "deep" ? 0.3 : 0.2,
    reasoningEffort: best.reasoning ? profileToReasoningEffort(modelProfile) : undefined,
  };
}

function profileToReasoningEffort(profile: ModelProfile): "low" | "medium" | "high" {
  switch (profile) {
    case "economy":
      return "low";
    case "balanced":
      return "medium";
    case "deep":
      return "high";
  }
}

/**
 * Estimate cost using the registry's pricing data.
 */
export function estimateModelCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string
): number {
  const entry = REGISTRY.find((m) => modelId.includes(m.id));
  const inPerM = entry?.inputPerMillion ?? 0.15;
  const outPerM = entry?.outputPerMillion ?? 0.60;
  return (inputTokens / 1_000_000) * inPerM + (outputTokens / 1_000_000) * outPerM;
}

/**
 * Get a model entry by ID (for logging/debugging).
 */
export function getModelEntry(modelId: string): ModelEntry | undefined {
  return REGISTRY.find((m) => m.id === modelId);
}
