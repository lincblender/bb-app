/**
 * POST /api/ai/run-analysis
 * Runs an AI analysis job. Request body matches the standard Edge request contract.
 */

import { NextResponse } from "next/server";
import { runAnalysisJob } from "@/lib/ai/run-analysis";
import { ANALYSIS_TO_PARADIGM } from "@/lib/ai/constants";
import type { AnalysisJobRequest, AnalysisType } from "@/lib/ai/types";
import { fetchCurrentTenantId } from "@/lib/workspace/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resolvedTenantId = await fetchCurrentTenantId();

    const jobId =
      typeof body.job_id === "string" ? body.job_id : crypto.randomUUID();
    const tenantId =
      typeof body.tenant_id === "string" ? body.tenant_id : resolvedTenantId ?? "unknown-tenant";
    const analysisType = (body.analysis_type ?? "RECOMMEND_BID_DECISION") as AnalysisType;
    const paradigm = body.paradigm ?? ANALYSIS_TO_PARADIGM[analysisType];
    const modelProfile = body.model_profile ?? "balanced";

    const req: AnalysisJobRequest = {
      job_id: jobId,
      tenant_id: tenantId,
      opportunity_id: body.opportunity_id ?? null,
      analysis_type: analysisType,
      paradigm,
      model_profile: modelProfile,
      model_override: body.model_override ?? null,
      inputs: {
        documents: body.inputs?.documents ?? [],
        company_profile: body.inputs?.company_profile ?? null,
        network_context: body.inputs?.network_context ?? null,
        knowledge_context: body.inputs?.knowledge_context ?? null,
        comparison_set: body.inputs?.comparison_set ?? null,
        chat_context: body.inputs?.chat_context ?? null,
      },
    };

    const response = await runAnalysisJob(req);
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
