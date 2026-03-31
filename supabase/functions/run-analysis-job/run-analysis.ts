/**
 * Core analysis logic for run-analysis-job.
 */

import OpenAI from "npm:openai";
import type { AnalysisJobRequest, AIAnalysisResponse } from "./types.ts";
import { getModelForJob, getReasoningEffort, isReasoningModel } from "./constants.ts";
import { buildUserPrompt } from "./prompt.ts";
import {
  buildExpectedEnvelope,
  validateEnvelopeWithReason,
  validateStrategicResultsWithReason,
} from "./validation.ts";
import { estimateCost } from "./cost.ts";
import { SYSTEM_PROMPT_TEMPLATE } from "./constants.ts";

const ANALYSIS_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export type EdgeAiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "ANALYSIS_FAILED"
  | "TIMEOUT";

type EdgeAiError = Error & {
  code: EdgeAiErrorCode;
  status: number;
  rawResults?: unknown;
};

function createEdgeAiError(
  code: EdgeAiErrorCode,
  message: string,
  status: number,
  extra?: { rawResults?: unknown },
): EdgeAiError {
  const error = new Error(message) as EdgeAiError;
  error.code = code;
  error.status = status;
  if (extra?.rawResults !== undefined) {
    error.rawResults = extra.rawResults;
  }
  return error;
}

function isRetryable(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    return RETRYABLE_STATUS.has((err as { status: number }).status);
  }
  if (err instanceof Error) {
    const message = `${err.name} ${err.message}`.toLowerCase();
    return message.includes("fetch") || message.includes("econnreset");
  }
  return false;
}

function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = `${err.name} ${err.message}`.toLowerCase();
  return message.includes("timeout") || message.includes("timed out") || message.includes("abort");
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
): Promise<T> {
  const baseDelayMs = 1_000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = isRetryable(err);
      const isLast = attempt === maxAttempts;

      if (!retryable || isLast) {
        if (retryable && isLast) {
          console.error(
            `[run-analysis-job] ${label}: Attempt ${attempt} failed. Giving up after ${maxAttempts} attempts.`,
          );
        }
        throw err;
      }

      const delayMs = baseDelayMs * Math.pow(3, attempt - 1);
      const status =
        err && typeof err === "object" && "status" in err ? (err as { status: number }).status : "network";

      console.warn(
        `[run-analysis-job] ${label}: Attempt ${attempt} failed (${status}). Retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`[run-analysis-job] ${label}: Retry loop exhausted`);
}

function classifyOpenAiError(err: unknown): EdgeAiError {
  if (err && typeof err === "object" && "code" in err && "status" in err) {
    return err as EdgeAiError;
  }
  if (isTimeoutError(err)) {
    return createEdgeAiError("TIMEOUT", "Analysis took too long. Try a simpler query or fewer attachments.", 504);
  }
  if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 429) {
    return createEdgeAiError("RATE_LIMITED", "You've reached the AI analysis limit. Try again in a moment.", 429);
  }
  return createEdgeAiError("ANALYSIS_FAILED", err instanceof Error ? err.message : "Analysis failed", 500);
}

export async function runAnalysis(req: AnalysisJobRequest): Promise<AIAnalysisResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw createEdgeAiError("AI_NOT_CONFIGURED", "AI features are not available right now.", 503);
  }

  const openai = new OpenAI({ apiKey });
  const modelId = getModelForJob(req.paradigm, req.model_profile);
  const startedAt = new Date().toISOString();
  const reasoning = isReasoningModel(modelId);
  const reasoningEffort = reasoning ? getReasoningEffort(req.model_profile) : null;

  console.log(`[run-analysis-job] ${req.paradigm}/${req.model_profile} → ${modelId}`);

  const systemPrompt =
    `${SYSTEM_PROMPT_TEMPLATE}\n\nExpected response structure:\n${JSON.stringify(buildExpectedEnvelope(req), null, 2)}`;
  const userPrompt = buildUserPrompt(req);

  let completion;
  try {
    const completionParams: Record<string, unknown> = {
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: reasoning ? 1 : req.model_profile === "deep" ? 0.3 : 0.2,
    };

    if (reasoningEffort) {
      completionParams.reasoning_effort = reasoningEffort;
    }

    completion = await withRetry(
      () =>
        openai.chat.completions.create(
          completionParams as OpenAI.ChatCompletionCreateParamsNonStreaming,
          { timeout: ANALYSIS_TIMEOUT_MS, maxRetries: 0 },
        ),
      `${req.paradigm}/${req.model_profile}`,
    );
  } catch (err) {
    throw classifyOpenAiError(err);
  }

  const choice = completion.choices[0];
  if (!choice?.message?.content) {
    throw createEdgeAiError("ANALYSIS_FAILED", "OpenAI returned empty response", 500);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(choice.message.content);
  } catch {
    throw createEdgeAiError("ANALYSIS_FAILED", "OpenAI response is not valid JSON", 500);
  }

  const validationWarnings: string[] = [];
  const envelopeValidation = validateEnvelopeWithReason(parsed);
  if (!envelopeValidation.valid) {
    const raw = parsed as Record<string, unknown>;
    const hasSummary = typeof raw?.summary === "string" && raw.summary.length > 0;
    const hasResults = typeof raw?.results === "object" && raw.results !== null;

    if (!hasSummary || !hasResults) {
      throw createEdgeAiError(
        "ANALYSIS_FAILED",
        `OpenAI response is missing required summary or results: ${envelopeValidation.reason}`,
        500,
      );
    }

    validationWarnings.push(`envelope_validation_failed:${envelopeValidation.reason}`);
    console.warn(
      `[run-analysis-job] VALIDATION WARNING: envelope check failed for ${req.paradigm}: ${envelopeValidation.reason}. Returning partial result.`,
    );
  }

  if (req.paradigm === "STRATEGIC_BID_INTELLIGENCE") {
    const validation = validateStrategicResultsWithReason((parsed as AIAnalysisResponse).results);
    if (!validation.valid) {
      validationWarnings.push(`strategic_schema_mismatch:${validation.reason}`);
      console.warn(
        `[run-analysis-job] VALIDATION WARNING: strategic schema mismatch for ${req.paradigm}: ${validation.reason}. Returning partial result.`,
      );
    }
  }

  const response = parsed as AIAnalysisResponse;
  const completedAt = new Date().toISOString();
  const latencyMs = Math.round(
    new Date(completedAt).getTime() - new Date(startedAt).getTime(),
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
    temperature: reasoning ? 1 : req.model_profile === "deep" ? 0.3 : 0.2,
    reasoning_effort: reasoningEffort,
  };

  if (validationWarnings.length > 0) {
    response.status = "partial";
    response.validation_warnings = validationWarnings;
  }

  return response;
}
