/**
 * BidBlender Model Registry
 *
 * Curated catalogue of OpenAI models with capability metadata.
 * The registry drives the `recommend_model` tool: given a task
 * description it scores every model and returns the best fit.
 *
 * Pricing is per-million tokens (USD) from:
 * https://platform.openai.com/docs/pricing (March 2026)
 */

export interface ModelCapabilities {
  /** Supports JSON-mode / structured output? */
  structuredOutput: boolean;
  /** Supports vision / image inputs? */
  vision: boolean;
  /** Supports function / tool calling? */
  functionCalling: boolean;
  /** Has extended chain-of-thought reasoning? */
  reasoning: boolean;
  /** Maximum context window (tokens) */
  contextWindow: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
}

export interface ModelPricing {
  /** USD per 1 M input tokens */
  inputPerMillion: number;
  /** USD per 1 M output tokens */
  outputPerMillion: number;
  /** USD per 1 M input tokens (cached, if applicable) */
  cachedInputPerMillion?: number;
}

export type ModelTier = "nano" | "economy" | "balanced" | "deep" | "reasoning";

export interface ModelEntry {
  id: string;
  displayName: string;
  tier: ModelTier;
  description: string;
  capabilities: ModelCapabilities;
  pricing: ModelPricing;
  /** Suggested paradigms this model excels at */
  bestFor: string[];
  /** Release date (ISO) — lets us prefer newer models */
  released: string;
  /** Whether the model is currently GA */
  available: boolean;
}

// ────────────────────────────────────────────────────────────────────
// Registry
// ────────────────────────────────────────────────────────────────────

export const MODEL_REGISTRY: ModelEntry[] = [
  // ── Nano / economy tier ──────────────────────────────────────────
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    tier: "economy",
    description:
      "Small, fast, cheap. Good for extraction, formatting, and simple classification tasks.",
    capabilities: {
      structuredOutput: true,
      vision: true,
      functionCalling: true,
      reasoning: false,
      contextWindow: 128_000,
      maxOutputTokens: 16_384,
    },
    pricing: {
      inputPerMillion: 0.15,
      outputPerMillion: 0.60,
      cachedInputPerMillion: 0.075,
    },
    bestFor: [
      "LOW_COST_EXTRACTION",
      "CLASSIFY_OPPORTUNITY_TYPE",
      "EXTRACT_METADATA",
      "formatting",
      "simple_classification",
    ],
    released: "2024-07-18",
    available: true,
  },
  {
    id: "gpt-4.1-nano",
    displayName: "GPT-4.1 Nano",
    tier: "nano",
    description:
      "Ultra-fast, ultra-cheap. Best for trivial extraction or routing decisions.",
    capabilities: {
      structuredOutput: true,
      vision: true,
      functionCalling: true,
      reasoning: false,
      contextWindow: 1_047_576,
      maxOutputTokens: 32_768,
    },
    pricing: {
      inputPerMillion: 0.10,
      outputPerMillion: 0.40,
      cachedInputPerMillion: 0.025,
    },
    bestFor: [
      "LOW_COST_EXTRACTION",
      "intent_routing",
      "formatting",
    ],
    released: "2025-04-14",
    available: true,
  },

  // ── Balanced tier ────────────────────────────────────────────────
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    tier: "balanced",
    description:
      "Strong general-purpose model. Good balance of quality, speed, and cost for most analysis tasks.",
    capabilities: {
      structuredOutput: true,
      vision: true,
      functionCalling: true,
      reasoning: false,
      contextWindow: 128_000,
      maxOutputTokens: 16_384,
    },
    pricing: {
      inputPerMillion: 2.50,
      outputPerMillion: 10.0,
      cachedInputPerMillion: 1.25,
    },
    bestFor: [
      "OPPORTUNITY_INTELLIGENCE",
      "COMPANY_FIT",
      "NETWORK_INFLUENCE",
      "COMPETITIVE_LANDSCAPE",
      "general_analysis",
    ],
    released: "2024-05-13",
    available: true,
  },
  {
    id: "gpt-4.1",
    displayName: "GPT-4.1",
    tier: "balanced",
    description:
      "Latest balanced model with very long context. Excellent for document-heavy analysis and coding.",
    capabilities: {
      structuredOutput: true,
      vision: true,
      functionCalling: true,
      reasoning: false,
      contextWindow: 1_047_576,
      maxOutputTokens: 32_768,
    },
    pricing: {
      inputPerMillion: 2.00,
      outputPerMillion: 8.0,
      cachedInputPerMillion: 0.50,
    },
    bestFor: [
      "OPPORTUNITY_INTELLIGENCE",
      "COMPANY_FIT",
      "NETWORK_INFLUENCE",
      "document_analysis",
      "long_context",
    ],
    released: "2025-04-14",
    available: true,
  },
  {
    id: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    tier: "economy",
    description:
      "Balanced quality at economy pricing. Good middle ground between 4o-mini and 4.1.",
    capabilities: {
      structuredOutput: true,
      vision: true,
      functionCalling: true,
      reasoning: false,
      contextWindow: 1_047_576,
      maxOutputTokens: 32_768,
    },
    pricing: {
      inputPerMillion: 0.40,
      outputPerMillion: 1.60,
      cachedInputPerMillion: 0.10,
    },
    bestFor: [
      "LOW_COST_EXTRACTION",
      "OPPORTUNITY_INTELLIGENCE",
      "CLASSIFY_OPPORTUNITY_TYPE",
      "general_analysis",
    ],
    released: "2025-04-14",
    available: true,
  },

  // ── Deep / reasoning tier ────────────────────────────────────────
  {
    id: "o3",
    displayName: "o3",
    tier: "reasoning",
    description:
      "Full reasoning model. Excellent for complex multi-step strategic analysis and bid decision logic.",
    capabilities: {
      structuredOutput: true,
      vision: true,
      functionCalling: true,
      reasoning: true,
      contextWindow: 200_000,
      maxOutputTokens: 100_000,
    },
    pricing: {
      inputPerMillion: 2.00,
      outputPerMillion: 8.00,
      cachedInputPerMillion: 0.50,
    },
    bestFor: [
      "STRATEGIC_BID_INTELLIGENCE",
      "RECOMMEND_BID_DECISION",
      "GENERATE_BID_STRATEGY",
      "CROSS_OPPORTUNITY_INTELLIGENCE",
      "complex_reasoning",
    ],
    released: "2025-04-16",
    available: true,
  },
  {
    id: "o3-mini",
    displayName: "o3-mini",
    tier: "deep",
    description:
      "Compact reasoning model. Good for moderately complex analysis at lower cost than full o3.",
    capabilities: {
      structuredOutput: true,
      vision: false,
      functionCalling: true,
      reasoning: true,
      contextWindow: 200_000,
      maxOutputTokens: 100_000,
    },
    pricing: {
      inputPerMillion: 1.10,
      outputPerMillion: 4.40,
      cachedInputPerMillion: 0.55,
    },
    bestFor: [
      "STRATEGIC_BID_INTELLIGENCE",
      "COMPETITIVE_LANDSCAPE",
      "ANALYSE_CONTRACT_RISK",
      "moderate_reasoning",
    ],
    released: "2025-01-31",
    available: true,
  },
  {
    id: "o4-mini",
    displayName: "o4-mini",
    tier: "deep",
    description:
      "Latest compact reasoning model with tool use. Efficient reasoning for structured tasks.",
    capabilities: {
      structuredOutput: true,
      vision: true,
      functionCalling: true,
      reasoning: true,
      contextWindow: 200_000,
      maxOutputTokens: 100_000,
    },
    pricing: {
      inputPerMillion: 1.10,
      outputPerMillion: 4.40,
      cachedInputPerMillion: 0.275,
    },
    bestFor: [
      "STRATEGIC_BID_INTELLIGENCE",
      "COMPETITIVE_LANDSCAPE",
      "ANALYSE_CONTRACT_RISK",
      "tool_use_reasoning",
    ],
    released: "2025-04-16",
    available: true,
  },
];

// ────────────────────────────────────────────────────────────────────
// Lookup helpers
// ────────────────────────────────────────────────────────────────────

export function getModelById(id: string): ModelEntry | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function getModelsByTier(tier: ModelTier): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.tier === tier && m.available);
}

export function getAvailableModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.available);
}
