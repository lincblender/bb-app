/**
 * BidBlender AI Analysis Job Runner
 * Builds prompts, calls OpenAI, validates responses per docs/AI.md
 * Uses dynamic model selection via lib/ai/model-router.ts
 */

import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import {
  type AnalysisJobRequest,
  type AIAnalysisResponse,
  type AnalysisType,
  type Paradigm,
  type StrategicBidIntelligenceResults,
} from "./types";
import {
  ANALYSIS_TO_PARADIGM,
  BID_DECISION_POLICY,
  PARADIGM_PROMPT_ADDITIONS,
  SYSTEM_PROMPT_TEMPLATE,
} from "./constants";
import { selectModel, estimateModelCost, type ModelSelection } from "./model-router";
import {
  checkAnalysisRateLimit,
  logAnalysisJob,
  extractErrorCode,
} from "./rate-limit";

// ─────────────────────────────────────────────────────────────────────────────
// Retry helper
// ─────────────────────────────────────────────────────────────────────────────

/** OpenAI status codes that are worth retrying (transient). */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Determines if an OpenAI SDK error is transiently retryable.
 * Checks the HTTP status on the error object (OpenAI SDK attaches `.status`).
 */
function isRetryable(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    return RETRYABLE_STATUS.has((err as { status: number }).status);
  }
  // Network errors (no status) are also retryable
  if (err instanceof Error && (err.message.includes("fetch") || err.message.includes("ECONNRESET"))) {
    return true;
  }
  return false;
}

/**
 * Calls `fn` up to `maxAttempts` times with exponential backoff between failures.
 * Only retries on transient errors (429, 5xx, network).
 * Throws immediately on non-retryable errors.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
): Promise<T> {
  const BASE_DELAY_MS = 1_000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = isRetryable(err);
      const isLast = attempt === maxAttempts;

      if (!retryable || isLast) {
        if (retryable && isLast) {
          console.error(`[run-analysis] ${label}: Attempt ${attempt} failed. Giving up after ${maxAttempts} attempts.`);
        }
        throw err;
      }

      const delayMs = BASE_DELAY_MS * Math.pow(3, attempt - 1); // 1s, 3s, 9s
      const status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : "network";
      console.warn(`[run-analysis] ${label}: Attempt ${attempt} failed (${status}). Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  // Unreachable — TypeScript needs this
  throw new Error(`[run-analysis] ${label}: Retry loop exhausted`);
}

/** Build user prompt from request inputs */
function buildUserPrompt(req: AnalysisJobRequest): string {
  const { analysis_type, paradigm, inputs } = req;
  const paradigmPrompt = PARADIGM_PROMPT_ADDITIONS[paradigm];
  const parts: string[] = [
    `Analysis type: ${analysis_type}`,
    `Paradigm: ${paradigm}`,
    "",
    paradigmPrompt,
    "",
    "---",
    "Inputs:",
  ];

  if (inputs.chat_context) {
    parts.push(`\nChat context:\n${inputs.chat_context}`);
  }
  if (paradigm === "STRATEGIC_BID_INTELLIGENCE") {
    parts.push(`\nDecision policy:\n${BID_DECISION_POLICY}`);
  }
  if (inputs.documents?.length) {
    parts.push(
      "\nDocuments:",
      ...inputs.documents.map(
        (d) => `\n[${d.name ?? d.id}]\n${(d.content ?? "").slice(0, 8000)}`
      )
    );
  }
  if (inputs.company_profile) {
    parts.push("\nCompany profile:", JSON.stringify(inputs.company_profile, null, 2));
  }
  if (inputs.network_context) {
    parts.push("\nNetwork context:", JSON.stringify(inputs.network_context, null, 2));
  }
  if (inputs.knowledge_context) {
    parts.push("\nKnowledge context:", JSON.stringify(inputs.knowledge_context, null, 2));
  }
  if (inputs.comparison_set?.length) {
    parts.push("\nComparison set:", JSON.stringify(inputs.comparison_set, null, 2));
  }

  if (parts.length === 7) {
    parts.push("\n(No structured inputs provided. Use general procurement intelligence knowledge.)");
  }

  parts.push(
    "",
    "---",
    "Return a valid JSON object matching the BidBlender AI response schema. Required top-level fields: schema_version, job_id, tenant_id, analysis_type, paradigm, status, model, summary, results, evidence, missing_data, confidence, db_records, usage, timestamps."
  );

  return parts.join("\n");
}

function validateStrategicResults(results: unknown): boolean {
  if (!results || typeof results !== "object") return false;
  const strategic = results as StrategicBidIntelligenceResults & Record<string, unknown>;
  const decision = strategic.bid_decision as Record<string, unknown> | undefined;
  if (!decision || typeof decision !== "object") return false;

  const decisionState = decision.decision_state;
  const recommendation = decision.recommendation;
  const confidence = decision.confidence;

  if (!["Green", "Amber", "Red"].includes(String(decisionState))) return false;
  if (!["Bid", "Research", "No Bid"].includes(String(recommendation))) return false;
  if (typeof confidence !== "number") return false;

  const requiredDimensions = [
    "pursuit_capacity",
    "buyer_access",
    "delivery_fit",
    "strategic_desire",
    "evidence_confidence",
  ];

  for (const key of requiredDimensions) {
    const value = strategic[key];
    if (!value || typeof value !== "object") return false;
    const dimension = value as Record<string, unknown>;
    if (typeof dimension.score !== "number") return false;
    if (!["strong", "mixed", "weak", "unknown"].includes(String(dimension.status))) return false;
    if (typeof dimension.summary !== "string" || dimension.summary.length === 0) return false;
  }

  if (!Array.isArray(strategic.decision_blockers)) return false;
  if (!Array.isArray(strategic.decision_movers)) return false;
  if (!Array.isArray(strategic.recommended_research_actions)) return false;

  return true;
}

/** Build the minimal envelope for the AI to fill - we inject job_id etc after */
function buildExpectedEnvelope(req: AnalysisJobRequest, selection: ModelSelection): Record<string, unknown> {
  const strategicResults =
    req.paradigm === "STRATEGIC_BID_INTELLIGENCE"
      ? {
          bid_decision: {
            decision_state: "Amber",
            recommendation: "Research",
            confidence: 50,
            decision_summary: "",
            rationale: [],
            why_now: [],
          },
          pursuit_capacity: { score: 0, status: "unknown", summary: "", positives: [], risks: [] },
          buyer_access: { score: 0, status: "unknown", summary: "", positives: [], risks: [] },
          delivery_fit: { score: 0, status: "unknown", summary: "", positives: [], risks: [] },
          strategic_desire: { score: 0, status: "unknown", summary: "", positives: [], risks: [] },
          evidence_confidence: { score: 0, status: "unknown", summary: "", positives: [], risks: [] },
          decision_blockers: [],
          decision_movers: [],
          recommended_research_actions: [],
          bid_strategy: { posture: "prime_contractor", notes: [] },
          narrative_positioning: [],
          differentiation_strategy: [],
          pricing_strategy: { pricing_posture: "market", notes: [] },
          stakeholder_engagement: [],
          next_steps: [],
        }
      : {};
  return {
    schema_version: "1.0.0",
    job_id: req.job_id,
    tenant_id: req.tenant_id,
    opportunity_id: req.opportunity_id ?? null,
    analysis_type: req.analysis_type,
    paradigm: req.paradigm,
    status: "success",
    model: {
      provider: "openai",
      model_id: selection.modelId,
      model_profile: req.model_profile,
      temperature: selection.temperature,
      reasoning_effort: selection.reasoningEffort ?? null,
    },
    summary: "",
    results: strategicResults,
    evidence: [],
    missing_data: [],
    confidence: { overall: 0.5, band: "medium", notes: "" },
    db_records: [],
    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, estimated_cost_usd: 0 },
    timestamps: { started_at: "", completed_at: "", latency_ms: 0 },
  };
}

/** Validate response has required envelope fields */
function validateEnvelope(obj: unknown): obj is AIAnalysisResponse {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  const required = [
    "schema_version",
    "job_id",
    "tenant_id",
    "analysis_type",
    "paradigm",
    "status",
    "model",
    "summary",
    "results",
    "evidence",
    "missing_data",
    "confidence",
    "db_records",
    "usage",
    "timestamps",
  ];
  for (const k of required) {
    if (!(k in o)) return false;
  }
  if (typeof o.summary !== "string" || o.summary.length === 0) return false;
  if (!Array.isArray(o.evidence)) return false;
  if (!Array.isArray(o.missing_data)) return false;
  if (typeof o.results !== "object" || o.results === null) return false;
  const model = o.model as Record<string, unknown>;
  if (!model || typeof model !== "object") return false;
  if (typeof model.provider !== "string" || typeof model.model_id !== "string") return false;
  const usage = o.usage as Record<string, unknown>;
  if (!usage || typeof usage !== "object") return false;
  if (typeof usage.input_tokens !== "number" || typeof usage.output_tokens !== "number") return false;
  const timestamps = o.timestamps as Record<string, unknown>;
  if (!timestamps || typeof timestamps !== "object") return false;
  if (typeof timestamps.started_at !== "string" || typeof timestamps.completed_at !== "string")
    return false;
  return true;
}

// Cost estimation now uses the model registry via estimateModelCost from model-router.ts

export interface RunAnalysisOptions {
  /** Override API key (default: process.env.OPENAI_API_KEY) */
  apiKey?: string;
}

/**
 * Run an AI analysis job. Calls OpenAI or routes to Supabase Edge Function.
 * Throws on missing API key, OpenAI errors, or invalid response.
 */
export async function runAnalysisJob(
  request: Omit<AnalysisJobRequest, "paradigm"> & { paradigm?: Paradigm },
  options?: RunAnalysisOptions
): Promise<AIAnalysisResponse> {
  const paradigm = request.paradigm ?? ANALYSIS_TO_PARADIGM[request.analysis_type];
  const req: AnalysisJobRequest = {
    ...request,
    paradigm,
  };

  // Route to Supabase Edge Function if configured for remote mode
  if (process.env.USE_SQLITE !== "true") {
    const supabase = await createClient();
    const jobStart = Date.now();

    // ── Rate limit check ───────────────────────────────────────────────────
    const rateLimit = await checkAnalysisRateLimit(supabase, req.tenant_id);
    if (!rateLimit.allowed) {
      const err = Object.assign(
        new Error(
          `Analysis rate limit reached (${rateLimit.used}/${rateLimit.limit} jobs this hour). ` +
          `Try again in ${rateLimit.retryAfterSeconds ?? 60}s.`
        ),
        { error_code: "rate_limited", retryAfterSeconds: rateLimit.retryAfterSeconds }
      );
      throw err;
    }

    // ── Call edge function ─────────────────────────────────────────────────
    let response: AIAnalysisResponse | null = null;
    let edgeError: unknown = null;

    try {
      const { data, error } = await supabase.functions.invoke("run-analysis-job", {
        body: req,
      });
      if (error) throw error;
      response = data as AIAnalysisResponse;
    } catch (err) {
      edgeError = err;
      console.error("Supabase Edge Function 'run-analysis-job' failed. Falling back to local execution:", err);
    }

    // ── Log job (success or edge-function failure) ─────────────────────────
    if (response) {
      await logAnalysisJob(supabase, {
        jobId: req.job_id,
        tenantId: req.tenant_id,
        analysisType: req.analysis_type,
        paradigm: req.paradigm,
        modelId: response.model?.model_id,
        modelProfile: req.model_profile,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        totalTokens: response.usage?.total_tokens,
        estimatedCostUsd: response.usage?.estimated_cost_usd,
        status: response.status ?? "success",
        latencyMs: response.timestamps?.latency_ms ?? (Date.now() - jobStart),
      });
      return response;
    }

    if (edgeError) {
      const code = extractErrorCode(edgeError);
      await logAnalysisJob(supabase, {
        jobId: req.job_id,
        tenantId: req.tenant_id,
        analysisType: req.analysis_type,
        paradigm: req.paradigm,
        modelProfile: req.model_profile,
        status: "failed",
        errorCode: code,
        latencyMs: Date.now() - jobStart,
      });
      // Only fall through to local execution on transient/unknown errors.
      // Hard errors (rate_limited, auth_error) should propagate immediately.
      if (code === "rate_limited" || code === "model_overloaded" || code === "auth_error" || code === "quota_exceeded") {
        throw edgeError;
      }
      // Transient / unknown → fall through to local execution below
    }
  }

  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const localJobStart = Date.now();

  // Dynamic model selection based on paradigm, profile, and constraints
  const selection = selectModel(req.paradigm, req.model_profile, {
    modelOverride: req.model_override ?? process.env.OPENAI_MODEL_OVERRIDE,
  });

  console.log(
    `[model-router] Selected ${selection.modelId} ` +
    `(source: ${selection.source}) for ${req.paradigm} / ${req.model_profile}` +
    (selection.reasoningEffort ? ` [reasoning: ${selection.reasoningEffort}]` : "")
  );

  const openai = new OpenAI({ apiKey });
  const startedAt = new Date().toISOString();

  const systemPrompt = `${SYSTEM_PROMPT_TEMPLATE}\n\nExpected response structure:\n${JSON.stringify(buildExpectedEnvelope(req, selection), null, 2)}`;
  const userPrompt = buildUserPrompt(req);

  // Build request options — reasoning models use different parameters
  const completionParams: OpenAI.ChatCompletionCreateParamsNonStreaming = {
    model: selection.modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  };

  if (selection.reasoning) {
    // o-series models: use reasoning_effort instead of temperature
    // temperature must be 1 (default) for reasoning models
    completionParams.temperature = 1;
    if (selection.reasoningEffort) {
      (completionParams as unknown as Record<string, unknown>).reasoning_effort = selection.reasoningEffort;
    }
  } else {
    completionParams.temperature = selection.temperature;
  }

  const completion = await withRetry(
    () => openai.chat.completions.create(completionParams),
    `${req.paradigm}/${req.model_profile}`,
  );

  const choice = completion.choices[0];
  if (!choice?.message?.content) {
    throw new Error("OpenAI returned empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(choice.message.content);
  } catch {
    throw new Error("OpenAI response is not valid JSON");
  }

  // ── Validate the envelope ────────────────────────────────────────────────────────
  const validationWarnings: string[] = [];

  // Genuinely unusable: no parseable content at all
  if (!validateEnvelope(parsed)) {
    const raw = parsed as Record<string, unknown>;
    const hasSummary = typeof raw?.summary === "string" && (raw.summary as string).length > 0;
    const hasResults = typeof raw?.results === "object" && raw.results !== null;

    if (!hasSummary || !hasResults) {
      throw new Error("OpenAI response is missing required summary or results — cannot produce a useful output");
    }

    // Has core content but failed other field checks — continue as partial
    validationWarnings.push("envelope_validation_failed");
    console.warn(`[run-analysis] VALIDATION WARNING: envelope check failed for ${req.paradigm}. Returning partial result.`);
  }

  // ── Strategic validator ─────────────────────────────────────────────────────────
  if (req.paradigm === "STRATEGIC_BID_INTELLIGENCE") {
    if (!validateStrategicResults((parsed as AIAnalysisResponse).results)) {
      validationWarnings.push("strategic_schema_mismatch");
      console.warn(`[run-analysis] VALIDATION WARNING: strategic result schema mismatch for ${req.paradigm}. Returning partial result.`);
    }
  }

  const response = parsed as AIAnalysisResponse;
  const completedAt = new Date().toISOString();
  const latencyMs = Math.round(
    new Date(completedAt).getTime() - new Date(startedAt).getTime()
  );

  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  const totalTokens = completion.usage?.total_tokens ?? inputTokens + outputTokens;

  response.timestamps = {
    started_at: startedAt,
    completed_at: completedAt,
    latency_ms: latencyMs,
  };
  response.usage = {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: estimateModelCost(inputTokens, outputTokens, selection.modelId),
  };
  response.model = {
    provider: "openai",
    model_id: selection.modelId,
    model_profile: req.model_profile,
    temperature: selection.temperature,
    reasoning_effort: selection.reasoningEffort ?? null,
  };

  // Stamp partial status and warnings if any validation issues were found
  if (validationWarnings.length > 0) {
    response.status = "partial";
    (response as unknown as Record<string, unknown>).validation_warnings = validationWarnings;
  }

  // Log local execution job (fallback path or SQLite mode)
  try {
    const supabase = await createClient();
    await logAnalysisJob(supabase, {
      jobId: req.job_id,
      tenantId: req.tenant_id,
      analysisType: req.analysis_type,
      paradigm: req.paradigm,
      modelId: selection.modelId,
      modelProfile: req.model_profile,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd: response.usage.estimated_cost_usd,
      status: response.status ?? "success",
      latencyMs: Date.now() - localJobStart,
    });
  } catch {
    // Non-fatal — never block the response for a logging failure
  }

  return response;
}

/**
 * Create a request for a chat-driven analysis (e.g. SWOT, compintel, bid-no-bid).
 * Infers analysis_type from user message when possible.
 */
export function createChatAnalysisRequest(
  userMessage: string,
  context: {
    tenantId: string;
    opportunityId?: string | null;
    companyProfile?: Record<string, unknown>;
    networkContext?: Record<string, unknown>;
    opportunitySummary?: string;
    knowledgeContext?: Record<string, unknown>;
    comparisonSet?: Record<string, unknown>[];
  }
): { analysis_type: AnalysisType; inputs: AnalysisJobRequest["inputs"] } {
  const lower = userMessage.toLowerCase().trim();

  const chatContext = context.opportunitySummary
    ? `${userMessage}\n\nOpportunity context:\n${context.opportunitySummary}\n\n${BID_DECISION_POLICY}`
    : `${userMessage}\n\n${BID_DECISION_POLICY}`;

  const baseInputs = {
    chat_context: chatContext,
    company_profile: context.companyProfile ?? null,
    network_context: context.networkContext ?? null,
    knowledge_context: context.knowledgeContext ?? null,
    comparison_set: context.comparisonSet ?? null,
  };

  if (
    lower.includes("swot") ||
    lower.includes("start swot") ||
    lower.includes("run swot")
  ) {
    return { analysis_type: "ANALYSE_RELATIONSHIP_DENSITY", inputs: baseInputs };
  }

  if (
    lower.includes("compintel") ||
    lower.includes("competitive intel") ||
    lower.includes("bid or not") ||
    lower.includes("bid-no-bid") ||
    lower.includes("run full") ||
    (lower.includes("worth") && lower.includes("bidding")) ||
    (lower.includes("review") && lower.includes("bid"))
  ) {
    return { analysis_type: "RECOMMEND_BID_DECISION", inputs: baseInputs };
  }

  if (
    lower.includes("best") ||
    lower.includes("highest") ||
    lower.includes("top") ||
    (lower.includes("recommend") && lower.includes("opportunity"))
  ) {
    return { analysis_type: "OPTIMISE_PORTFOLIO", inputs: baseInputs };
  }

  return { analysis_type: "RECOMMEND_BID_DECISION", inputs: baseInputs };
}
