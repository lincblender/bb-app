/**
 * Core analysis logic for run-analysis-job.
 */

import OpenAI from "npm:openai";
import type { AnalysisJobRequest, AIAnalysisResponse } from "./types.ts";
import { getModelByProfile } from "./constants.ts";
import { buildUserPrompt } from "./prompt.ts";
import { buildExpectedEnvelope, validateEnvelope, validateStrategicResultsWithReason } from "./validation.ts";
import { estimateCost } from "./cost.ts";
import { SYSTEM_PROMPT_TEMPLATE } from "./constants.ts";

export async function runAnalysis(req: AnalysisJobRequest): Promise<AIAnalysisResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey });
  const modelId = getModelByProfile(req.model_profile);
  const startedAt = new Date().toISOString();

  const systemPrompt = `${SYSTEM_PROMPT_TEMPLATE}\n\nExpected response structure:\n${JSON.stringify(buildExpectedEnvelope(req), null, 2)}`;
  const userPrompt = buildUserPrompt(req);

  const completion = await openai.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: req.model_profile === "deep" ? 0.3 : 0.2,
  });

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

  if (!validateEnvelope(parsed)) {
    throw new Error("OpenAI response does not match required envelope structure");
  }

  if (req.paradigm === "STRATEGIC_BID_INTELLIGENCE") {
    const validation = validateStrategicResultsWithReason((parsed as AIAnalysisResponse).results);
    if (!validation.valid) {
      const err = new Error("OpenAI response does not match required strategic decision structure") as Error & { rawResults?: unknown };
      err.rawResults = validation.rawResults;
      err.message = `${err.message}: ${validation.reason}`;
      throw err;
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
    estimated_cost_usd: estimateCost(inputTokens, outputTokens, modelId),
  };
  response.model = {
    provider: "openai",
    model_id: modelId,
    model_profile: req.model_profile,
    temperature: req.model_profile === "deep" ? 0.3 : 0.2,
  };

  return response;
}
