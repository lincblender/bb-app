/**
 * BidBlender AI Analysis Job - Supabase Edge Function
 *
 * Accepts POST with standard request contract, calls OpenAI, returns canonical envelope.
 * Uses OPENAI_API_KEY, OPENAI_MODEL_DEFAULT, OPENAI_MODEL_DEEP from Supabase secrets.
 */

import { parseRequestBody } from "./parse.ts";
import { runAnalysis } from "./run-analysis.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Error classification
// ─────────────────────────────────────────────────────────────────────────────

type ErrorCode =
  | "rate_limited"
  | "model_overloaded"
  | "auth_error"
  | "validation_failed"
  | "parse_error"
  | "schema_error"
  | "empty_response"
  | "request_invalid"
  | "request_timeout"
  | "service_unavailable"
  | "unknown";

interface ClassifiedError {
  code: ErrorCode;
  httpStatus: number;
  /** Seconds until caller should retry (only present for rate_limited). */
  retryAfterSeconds?: number;
}

function classifyError(err: unknown): ClassifiedError {
  // Errors thrown by our own code carry an .errorCode property
  const explicitCode = (err as Record<string, unknown>)?.errorCode;
  if (typeof explicitCode === "string") {
    switch (explicitCode) {
      case "empty_response": return { code: "empty_response", httpStatus: 502 };
      case "parse_error":    return { code: "parse_error",    httpStatus: 502 };
      case "schema_error":   return { code: "schema_error",   httpStatus: 502 };
    }
  }

  // OpenAI SDK errors expose .status
  const status =
    err && typeof err === "object" && "status" in err
      ? (err as { status: number }).status
      : null;

  if (status === 401) return { code: "auth_error",    httpStatus: 503 };
  if (status === 400) return { code: "request_invalid", httpStatus: 400 };
  if (status === 408) return { code: "request_timeout", httpStatus: 504 };

  if (status === 429) {
    // OpenAI rate limit — surface as 429, include retry hint if available
    const headers = (err as Record<string, unknown>)?.headers as Record<string, string> | undefined;
    const retryAfter = headers?.["retry-after"] ? parseInt(headers["retry-after"], 10) : 10;
    const isOverloaded = /overload|capacity/i.test(
      err instanceof Error ? err.message : ""
    );
    return {
      code: isOverloaded ? "model_overloaded" : "rate_limited",
      httpStatus: 429,
      retryAfterSeconds: isNaN(retryAfter) ? 10 : retryAfter,
    };
  }

  if (status === 503 || status === 504) {
    return { code: "service_unavailable", httpStatus: 502 };
  }

  const msg = err instanceof Error ? err.message : "";
  if (msg.includes("OPENAI_API_KEY")) return { code: "auth_error", httpStatus: 503 };

  return { code: "unknown", httpStatus: 500 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Request handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", error_code: "request_invalid" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Request body is not valid JSON", error_code: "request_invalid" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let analysisReq;
  try {
    analysisReq = parseRequestBody(body);
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Invalid request",
        error_code: "request_invalid",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const response = await runAnalysis(analysisReq);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const { code, httpStatus, retryAfterSeconds } = classifyError(err);
    const message = err instanceof Error ? err.message : "Analysis failed";

    const responseBody: Record<string, unknown> = {
      error: message,
      error_code: code,
    };

    // Attach raw_results if the validator threw with them attached
    if (err && typeof err === "object" && "rawResults" in err) {
      responseBody.raw_results = (err as Error & { rawResults?: unknown }).rawResults;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (retryAfterSeconds !== undefined) {
      headers["Retry-After"] = String(retryAfterSeconds);
      responseBody.retry_after_seconds = retryAfterSeconds;
    }

    console.error(`[run-analysis-job] Error: ${code} — ${message}`);

    return new Response(JSON.stringify(responseBody), { status: httpStatus, headers });
  }
});
