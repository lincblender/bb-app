/**
 * Model Recommendation Engine
 *
 * Given a task description and constraints, scores every model in the
 * registry and returns a ranked recommendation list.
 */

import {
  MODEL_REGISTRY,
  type ModelEntry,
  type ModelTier,
} from "./registry.js";

// ────────────────────────────────────────────────────────────────────
// Input types
// ────────────────────────────────────────────────────────────────────

export interface RecommendationRequest {
  /** What is the task? Free-text description. */
  task: string;
  /** BidBlender paradigm (optional, improves matching) */
  paradigm?: string;
  /** BidBlender analysis type (optional) */
  analysisType?: string;
  /** Rough complexity: low / medium / high */
  complexity?: "low" | "medium" | "high";
  /** Does the task require multi-step reasoning? */
  requiresReasoning?: boolean;
  /** Does the task need structured JSON output? */
  requiresStructuredOutput?: boolean;
  /** Does the task include image/vision inputs? */
  requiresVision?: boolean;
  /** Approximate input size in tokens */
  estimatedInputTokens?: number;
  /** Budget constraint: cheap / moderate / unlimited */
  budgetConstraint?: "cheap" | "moderate" | "unlimited";
}

export interface ScoredModel {
  model: ModelEntry;
  score: number;
  reasons: string[];
  estimatedCostPer1kTokens: number;
}

export interface RecommendationResult {
  recommended: ScoredModel;
  alternatives: ScoredModel[];
  reasoning: string;
}

// ────────────────────────────────────────────────────────────────────
// Scoring logic
// ────────────────────────────────────────────────────────────────────

const TIER_QUALITY: Record<ModelTier, number> = {
  nano: 20,
  economy: 40,
  balanced: 70,
  deep: 85,
  reasoning: 95,
};

function scoreModel(model: ModelEntry, req: RecommendationRequest): ScoredModel {
  let score = 0;
  const reasons: string[] = [];

  // 1. Paradigm / analysis type match (strong signal)
  if (req.paradigm && model.bestFor.includes(req.paradigm)) {
    score += 25;
    reasons.push(`Direct paradigm match: ${req.paradigm}`);
  }
  if (req.analysisType && model.bestFor.includes(req.analysisType)) {
    score += 20;
    reasons.push(`Analysis type match: ${req.analysisType}`);
  }

  // 2. Complexity alignment
  const complexity = req.complexity ?? "medium";
  if (complexity === "low") {
    // Prefer cheap models
    if (model.tier === "nano" || model.tier === "economy") {
      score += 20;
      reasons.push("Economy tier suits low complexity");
    }
  } else if (complexity === "medium") {
    if (model.tier === "balanced" || model.tier === "economy") {
      score += 15;
      reasons.push("Balanced tier suits medium complexity");
    }
  } else {
    // high complexity
    if (model.tier === "deep" || model.tier === "reasoning") {
      score += 25;
      reasons.push("Deep/reasoning tier suits high complexity");
    }
  }

  // 3. Reasoning requirement
  if (req.requiresReasoning) {
    if (model.capabilities.reasoning) {
      score += 20;
      reasons.push("Model has chain-of-thought reasoning");
    } else {
      score -= 15;
      reasons.push("Model lacks reasoning capability (penalty)");
    }
  }

  // 4. Structured output requirement
  if (req.requiresStructuredOutput !== false) {
    if (model.capabilities.structuredOutput) {
      score += 5;
    } else {
      score -= 10;
      reasons.push("No structured output support (penalty)");
    }
  }

  // 5. Vision requirement
  if (req.requiresVision) {
    if (model.capabilities.vision) {
      score += 10;
      reasons.push("Vision capability available");
    } else {
      score -= 25;
      reasons.push("Vision required but not supported (hard penalty)");
    }
  }

  // 6. Context window fit
  const estimatedTokens = req.estimatedInputTokens ?? 4000;
  if (estimatedTokens > model.capabilities.contextWindow * 0.8) {
    score -= 30;
    reasons.push(
      `Input (${estimatedTokens} tokens) may exceed context (${model.capabilities.contextWindow})`
    );
  } else if (estimatedTokens > 100_000 && model.capabilities.contextWindow >= 1_000_000) {
    score += 10;
    reasons.push("Large context window accommodates long input");
  }

  // 7. Budget constraint
  const budget = req.budgetConstraint ?? "moderate";
  const costPer1k =
    (model.pricing.inputPerMillion / 1000) + (model.pricing.outputPerMillion / 1000);

  if (budget === "cheap") {
    if (costPer1k <= 0.002) {
      score += 15;
      reasons.push("Very low cost fits budget");
    } else if (costPer1k > 0.01) {
      score -= 15;
      reasons.push("Cost too high for cheap budget");
    }
  } else if (budget === "unlimited") {
    // Prefer quality
    score += TIER_QUALITY[model.tier] * 0.2;
    reasons.push("Budget unlimited, quality preferred");
  }

  // 8. Baseline quality score (tie-breaker)
  score += TIER_QUALITY[model.tier] * 0.1;

  // 9. Availability gate
  if (!model.available) {
    score = -100;
    reasons.push("Model not currently available");
  }

  return {
    model,
    score: Math.round(score * 10) / 10,
    reasons,
    estimatedCostPer1kTokens: Math.round(costPer1k * 100_000) / 100_000,
  };
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export function recommendModel(req: RecommendationRequest): RecommendationResult {
  const scored = MODEL_REGISTRY
    .filter((m) => m.available)
    .map((m) => scoreModel(m, req))
    .sort((a, b) => b.score - a.score);

  const recommended = scored[0];
  const alternatives = scored.slice(1, 4);

  const reasoning = [
    `Recommended **${recommended.model.displayName}** (${recommended.model.id}) with score ${recommended.score}.`,
    `Tier: ${recommended.model.tier} | Context: ${(recommended.model.capabilities.contextWindow / 1000).toFixed(0)}k tokens | Reasoning: ${recommended.model.capabilities.reasoning ? "yes" : "no"}`,
    `Estimated cost: $${recommended.estimatedCostPer1kTokens.toFixed(5)} per 1k tokens`,
    "",
    "Key reasons:",
    ...recommended.reasons.map((r) => `  • ${r}`),
  ].join("\n");

  return { recommended, alternatives, reasoning };
}
