/**
 * Request parsing for run-analysis-job.
 */

import type { AnalysisJobRequest, AnalysisInputs } from "./types.ts";
import { ANALYSIS_TO_PARADIGM } from "./constants.ts";

export function parseRequestBody(body: unknown): AnalysisJobRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  const jobId = typeof b.job_id === "string" ? b.job_id : crypto.randomUUID();
  const tenantId =
    typeof b.tenant_id === "string" && b.tenant_id.length > 0
      ? b.tenant_id
      : "unknown-tenant";
  const analysisType = (b.analysis_type ?? "RECOMMEND_BID_DECISION") as AnalysisJobRequest["analysis_type"];
  const paradigm = (b.paradigm ?? ANALYSIS_TO_PARADIGM[analysisType]) as AnalysisJobRequest["paradigm"];
  const modelProfile = (b.model_profile ?? "balanced") as AnalysisJobRequest["model_profile"];

  const inputs = b.inputs;
  const inputsObj =
    inputs && typeof inputs === "object"
      ? (inputs as Record<string, unknown>)
      : {};

  return {
    job_id: jobId,
    tenant_id: tenantId,
    opportunity_id: (b.opportunity_id ?? null) as string | null,
    analysis_type: analysisType,
    paradigm,
    model_profile: modelProfile,
    model_override: (b.model_override ?? null) as string | null,
    inputs: {
      documents: (inputsObj.documents as AnalysisInputs["documents"]) ?? [],
      company_profile: (inputsObj.company_profile as AnalysisInputs["company_profile"]) ?? null,
      network_context: (inputsObj.network_context as AnalysisInputs["network_context"]) ?? null,
      knowledge_context: (inputsObj.knowledge_context as AnalysisInputs["knowledge_context"]) ?? null,
      comparison_set: (inputsObj.comparison_set as AnalysisInputs["comparison_set"]) ?? null,
      chat_context: (inputsObj.chat_context as AnalysisInputs["chat_context"]) ?? null,
    },
  };
}
