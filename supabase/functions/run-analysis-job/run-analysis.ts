/**
 * Core analysis logic for run-analysis-job.
 */

import OpenAI from "npm:openai";
import type { AnalysisJobRequest, AIAnalysisResponse } from "./types.ts";
import { getModelForJob } from "./constants.ts";
import { buildUserPrompt } from "./prompt.ts";
import { buildExpectedEnvelope, validateEnvelope, validateStrategicResultsWithReason } from "./validation.ts";
import { estimateCost } from "./cost.ts";
import { SYSTEM_PROMPT_TEMPLATE } from "./constants.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Retry helpers
// ─────────────────────────────────────────────────────────────────────────────

/** HTTP status codes worth retrying (transient server-side failures). */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

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
 * Calls `fn` up to `maxAttempts` times with exponential backoff.
 * Only retries on transient errors (429, 5xx, network).
 * Throws immediately on non-retryable errors (400, 401, etc.).
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
          console.error(
            `[run-analysis-job] ${label}: attempt ${attempt} failed. Giving up after ${maxAttempts} attempts.`
          );
        }
        throw err;
      }

      const delayMs = BASE_DELAY_MS * Math.pow(3, attempt - 1); // 1s, 3s, 9s
      const code =
        err && typeof err === "object" && "status" in err
          ? (err as { status: number }).status
          : "network";
      console.warn(
        `[run-analysis-job] ${label}: attempt ${attempt} failed (${code}). Retrying in ${delayMs}ms…`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`[run-analysis-job] ${label}: retry loop exhausted`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main analysis function
// ─────────────────────────────────────────────────────────────────────────────

export async function runAnalysis(req: AnalysisJobRequest): Promise<AIAnalysisResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey });
  const modelId = getModelForJob(req.paradigm, req.model_profile);
  const startedAt = new Date().toISOString();

  console.log(`[run-analysis-job] ${req.paradigm}/${req.model_profile} → ${modelId}`);

  const systemPrompt = `${SYSTEM_PROMPT_TEMPLATE}\n\nExpected response structure:\n${JSON.stringify(buildExpectedEnvelope(req), null, 2)}`;
  const userPrompt = buildUserPrompt(req);

  // ── OpenAI call with retry ───────────────────────────────────────────────
  const completion = await withRetry(
    () =>
      openai.chat.completions.create({
        model: modelId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: req.model_profile === "deep" ? 0.3 : 0.2,
      }),
    `${req.paradigm}/${req.model_profile}`,
  );

  const choice = completion.choices[0];
  if (!choice?.message?.content) {
    const emptyErr = new Error("OpenAI returned empty response") as Error & { errorCode?: string };
    emptyErr.errorCode = "empty_response";
    throw emptyErr;
  }

  // ── Parse JSON ───────────────────────────────────────────────────────────
  let parsed: unknown;
  try {
    parsed = JSON.parse(choice.message.content);
  } catch {
    const parseErr = new Error("OpenAI response is not valid JSON") as Error & { errorCode?: string };
    parseErr.errorCode = "parse_error";
    throw parseErr;
  }

  // ── Validate envelope — progressive (warn, not hard-fail) ───────────────
  const validationWarnings: string[] = [];

  if (!validateEnvelope(parsed)) {
    const raw = parsed as Record<string, unknown>;
    const hasSummary = typeof raw?.summary === "string" && (raw.summary as string).length > 0;
    const hasResults = typeof raw?.results === "object" && raw.results !== null;

    if (!hasSummary || !hasResults) {
      // Truly unrecoverable — no usable output
      const schemaErr = new Error(
        "OpenAI response is missing required summary or results"
      ) as Error & { errorCode?: string };
      schemaErr.errorCode = "schema_error";
      throw schemaErr;
    }

    // Has core content but failed other field checks — continue as partial
    validationWarnings.push("envelope_validation_failed");
    console.warn(
      `[run-analysis-job] VALIDATION WARNING: envelope check failed for ${req.paradigm}. Returning partial result.`
    );
  }

  // ── Strategic schema — progressive (warn, not hard-fail) ────────────────
  if (req.paradigm === "STRATEGIC_BID_INTELLIGENCE") {
    const validation = validateStrategicResultsWithReason((parsed as AIAnalysisResponse).results);
    if (!validation.valid) {
      validationWarnings.push("strategic_schema_mismatch");
      console.warn(
        `[run-analysis-job] VALIDATION WARNING: strategic schema mismatch (${validation.reason}). Returning partial result.`
      );
      // Attach raw_results for the UI to inspect if it needs to
      (parsed as Record<string, unknown>)._raw_strategic_results = validation.rawResults;
    }
  }

  // ── Build response ───────────────────────────────────────────────────────
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

  if (validationWarnings.length > 0) {
    response.status = "partial";
    (response as unknown as Record<string, unknown>).validation_warnings = validationWarnings;
  }

  return response;
}
