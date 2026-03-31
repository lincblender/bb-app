/**
 * Validation and envelope building for run-analysis-job.
 */

import type {
  AnalysisJobRequest,
  AIAnalysisResponse,
  StrategicBidIntelligenceResults,
} from "./types.ts";
import { getModelForJob, getReasoningEffort, isReasoningModel } from "./constants.ts";

const DIMENSION_KEYS = [
  ["pursuit_capacity", "pursuitCapacity"],
  ["buyer_access", "buyerAccess"],
  ["delivery_fit", "deliveryFit"],
  ["strategic_desire", "strategicDesire"],
  ["evidence_confidence", "evidenceConfidence"],
] as const;

function getDimension(obj: Record<string, unknown>, keys: readonly [string, string]) {
  return obj[keys[0]] ?? obj[keys[1]];
}

export type StrategicValidationResult =
  | { valid: true }
  | { valid: false; reason: string; rawResults: unknown };

export type EnvelopeValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateStrategicResults(results: unknown): boolean {
  const r = validateStrategicResultsWithReason(results);
  return r.valid;
}

export function validateStrategicResultsWithReason(results: unknown): StrategicValidationResult {
  if (!results || typeof results !== "object") {
    return { valid: false, reason: "results is not an object", rawResults: results };
  }
  const strategic = results as StrategicBidIntelligenceResults & Record<string, unknown>;
  const decision = (strategic.bid_decision ?? strategic.bidDecision) as Record<string, unknown> | undefined;
  if (!decision || typeof decision !== "object") {
    return { valid: false, reason: "bid_decision missing or not object", rawResults: results };
  }

  const decisionState = (decision.decision_state ?? decision.decisionState ?? "").toString();
  const recommendation = (decision.recommendation ?? "").toString();
  const confidence = decision.confidence;

  if (!["green", "amber", "red"].includes(decisionState.toLowerCase())) {
    return { valid: false, reason: `decision_state invalid: "${decisionState}"`, rawResults: results };
  }
  if (!["bid", "research", "no bid"].includes(recommendation.toLowerCase())) {
    return { valid: false, reason: `recommendation invalid: "${recommendation}"`, rawResults: results };
  }
  if (typeof confidence !== "number") {
    return { valid: false, reason: `confidence not number: ${typeof confidence}`, rawResults: results };
  }

  for (const keys of DIMENSION_KEYS) {
    const value = getDimension(strategic, keys);
    const dimName = keys[0];
    if (!value || typeof value !== "object") {
      return { valid: false, reason: `dimension ${dimName} missing or not object`, rawResults: results };
    }
    const dimension = value as Record<string, unknown>;
    if (typeof dimension.score !== "number") {
      return { valid: false, reason: `${dimName}.score not number`, rawResults: results };
    }
    const status = String(dimension.status ?? "").toLowerCase();
    const validStatuses = ["strong", "mixed", "weak", "unknown", "positive", "negative"];
    if (!validStatuses.includes(status)) {
      return { valid: false, reason: `${dimName}.status invalid: "${dimension.status}"`, rawResults: results };
    }
    if (typeof dimension.summary !== "string") {
      return { valid: false, reason: `${dimName}.summary not string`, rawResults: results };
    }
  }

  const blockers = strategic.decision_blockers ?? strategic.decisionBlockers;
  const movers = strategic.decision_movers ?? strategic.decisionMovers;
  const actions = strategic.recommended_research_actions ?? strategic.recommendedResearchActions;
  if (!Array.isArray(blockers)) {
    return { valid: false, reason: `decision_blockers not array (${typeof blockers})`, rawResults: results };
  }
  if (!Array.isArray(movers)) {
    return { valid: false, reason: `decision_movers not array (${typeof movers})`, rawResults: results };
  }
  if (!Array.isArray(actions)) {
    return { valid: false, reason: `recommended_research_actions not array (${typeof actions})`, rawResults: results };
  }

  return { valid: true };
}

export function buildExpectedEnvelope(req: AnalysisJobRequest): Record<string, unknown> {
  const modelId = getModelForJob(req.paradigm, req.model_profile);
  const reasoning = isReasoningModel(modelId);
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
      model_id: modelId,
      model_profile: req.model_profile,
      temperature: reasoning ? 1 : req.model_profile === "deep" ? 0.3 : 0.2,
      reasoning_effort: reasoning ? getReasoningEffort(req.model_profile) : null,
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

export function validateEnvelope(obj: unknown): obj is AIAnalysisResponse {
  return validateEnvelopeWithReason(obj).valid;
}

export function validateEnvelopeWithReason(obj: unknown): EnvelopeValidationResult {
  if (!obj || typeof obj !== "object") return { valid: false, reason: "response is not an object" };
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
    if (!(k in o)) return { valid: false, reason: `missing required field: ${k}` };
  }
  if (typeof o.summary !== "string" || o.summary.length === 0) {
    return { valid: false, reason: "summary must be a non-empty string" };
  }
  if (!Array.isArray(o.evidence)) return { valid: false, reason: "evidence must be an array" };
  if (!Array.isArray(o.missing_data)) return { valid: false, reason: "missing_data must be an array" };
  if (typeof o.results !== "object" || o.results === null) {
    return { valid: false, reason: "results must be an object" };
  }
  const model = o.model as Record<string, unknown>;
  if (!model || typeof model !== "object") return { valid: false, reason: "model must be an object" };
  if (typeof model.provider !== "string" || typeof model.model_id !== "string") {
    return { valid: false, reason: "model.provider and model.model_id must be strings" };
  }
  const usage = o.usage as Record<string, unknown>;
  if (!usage || typeof usage !== "object") return { valid: false, reason: "usage must be an object" };
  if (typeof usage.input_tokens !== "number" || typeof usage.output_tokens !== "number") {
    return { valid: false, reason: "usage.input_tokens and usage.output_tokens must be numbers" };
  }
  const timestamps = o.timestamps as Record<string, unknown>;
  if (!timestamps || typeof timestamps !== "object") return { valid: false, reason: "timestamps must be an object" };
  if (typeof timestamps.started_at !== "string" || typeof timestamps.completed_at !== "string") {
    return { valid: false, reason: "timestamps.started_at and timestamps.completed_at must be strings" };
  }
  return { valid: true };
}
