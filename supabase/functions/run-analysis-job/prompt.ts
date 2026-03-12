/**
 * Prompt building for run-analysis-job.
 */

import type { AnalysisJobRequest } from "./types.ts";
import { PARADIGM_PROMPT_ADDITIONS, BID_DECISION_POLICY } from "./constants.ts";

export function buildUserPrompt(req: AnalysisJobRequest): string {
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
