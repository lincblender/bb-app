/**
 * Per-tenant analysis rate limiting and job logging.
 *
 * Rate limits use the analysis_jobs table as the durable counter — no Redis
 * or separate counter store needed. Limits are checked in the Next.js layer
 * before the edge function is called, so they apply regardless of execution path.
 *
 * Default limit: 60 jobs per tenant per hour (generous during development).
 * This will be tightened per billing plan once Stripe is wired.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Rate limit configuration
// ---------------------------------------------------------------------------

/** Jobs allowed per tenant per rolling hour window. */
const DEFAULT_JOBS_PER_HOUR = 60;

export interface RateLimitResult {
  allowed: boolean;
  /** How many jobs the tenant has run in the current window. */
  used: number;
  /** Maximum jobs allowed in the window. */
  limit: number;
  /** Seconds until the oldest job in the window rolls off (i.e. when to retry). */
  retryAfterSeconds?: number;
}

/**
 * Check whether a tenant is within their analysis rate limit.
 * Returns `allowed: true` if the call should proceed.
 */
export async function checkAnalysisRateLimit(
  supabase: SupabaseClient,
  tenantId: string,
  limitPerHour = DEFAULT_JOBS_PER_HOUR
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("analysis_jobs")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", windowStart);

  if (error) {
    // On DB error, allow the call through rather than blocking. Log and continue.
    console.error("[rate-limit] Failed to check rate limit:", error.message);
    return { allowed: true, used: 0, limit: limitPerHour };
  }

  const used = count ?? 0;

  if (used < limitPerHour) {
    return { allowed: true, used, limit: limitPerHour };
  }

  // Find the oldest job in the window to know when capacity opens up
  const { data: oldest } = await supabase
    .from("analysis_jobs")
    .select("created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const retryAfterSeconds = oldest?.created_at
    ? Math.ceil(
        (new Date(oldest.created_at as string).getTime() + 60 * 60 * 1000 - Date.now()) / 1000
      )
    : 60;

  return {
    allowed: false,
    used,
    limit: limitPerHour,
    retryAfterSeconds: Math.max(1, retryAfterSeconds),
  };
}

// ---------------------------------------------------------------------------
// Job logging
// ---------------------------------------------------------------------------

export interface AnalysisJobLog {
  jobId: string;
  tenantId: string;
  analysisType?: string;
  paradigm?: string;
  modelId?: string;
  modelProfile?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  status: "success" | "partial" | "failed";
  errorCode?: string | null;
  latencyMs?: number;
}

/**
 * Record an analysis job in the analysis_jobs table.
 * Non-fatal — logs errors but does not throw.
 */
export async function logAnalysisJob(
  supabase: SupabaseClient,
  job: AnalysisJobLog
): Promise<void> {
  const { error } = await supabase.from("analysis_jobs").insert({
    id: `ajob-${crypto.randomUUID()}`,
    tenant_id: job.tenantId,
    job_id: job.jobId,
    analysis_type: job.analysisType ?? null,
    paradigm: job.paradigm ?? null,
    model_id: job.modelId ?? null,
    model_profile: job.modelProfile ?? null,
    input_tokens: job.inputTokens ?? 0,
    output_tokens: job.outputTokens ?? 0,
    total_tokens: job.totalTokens ?? 0,
    estimated_cost_usd: job.estimatedCostUsd ?? 0,
    status: job.status,
    error_code: job.errorCode ?? null,
    latency_ms: job.latencyMs ?? null,
  });

  if (error) {
    console.error("[rate-limit] Failed to log analysis job:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Error code extraction from edge function / OpenAI error responses
// ---------------------------------------------------------------------------

export type AnalysisErrorCode =
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
  | "quota_exceeded"
  | "unknown";

/**
 * Extract a structured error code from an edge function error response body
 * or a caught exception.
 */
export function extractErrorCode(err: unknown): AnalysisErrorCode {
  if (!err) return "unknown";

  // Error body from our edge function (has .error_code)
  if (typeof err === "object" && "error_code" in err) {
    return (err as { error_code: AnalysisErrorCode }).error_code ?? "unknown";
  }

  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "RATE_LIMITED") return "rate_limited";
    if (code === "AI_NOT_CONFIGURED") return "auth_error";
    if (code === "INVALID_REQUEST") return "request_invalid";
    if (code === "TIMEOUT") return "request_timeout";
    if (code === "ANALYSIS_FAILED") return "unknown";
  }

  // Supabase FunctionsHttpError — body may be JSON
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("429")) return "rate_limited";
    if (msg.includes("overload") || msg.includes("capacity")) return "model_overloaded";
    if (msg.includes("api key") || msg.includes("401")) return "auth_error";
    if (msg.includes("json")) return "parse_error";
    if (msg.includes("503") || msg.includes("504")) return "service_unavailable";
  }

  return "unknown";
}

/**
 * Map an error code to a user-facing message for display in the UI.
 */
export function errorCodeToUserMessage(code: AnalysisErrorCode): string {
  switch (code) {
    case "rate_limited":
      return "You've reached the analysis limit for this hour. Wait a moment and try again.";
    case "model_overloaded":
      return "The AI model is under heavy load right now. Try again in a minute.";
    case "auth_error":
      return "AI service authentication failed. Contact support if this persists.";
    case "parse_error":
    case "schema_error":
      return "The AI returned an unexpected response format. The analysis could not be completed.";
    case "empty_response":
      return "The AI returned an empty response. Try again or use a different analysis type.";
    case "service_unavailable":
      return "The AI service is temporarily unavailable. Try again in a few minutes.";
    case "quota_exceeded":
      return "The AI quota for this workspace has been reached. Upgrade your plan or wait until the quota resets.";
    case "request_invalid":
      return "The analysis request was invalid. Refresh and try again.";
    default:
      return "An unexpected error occurred with the AI analysis. Try again or contact support.";
  }
}
