/**
 * BidBlender AI Analysis Job - Supabase Edge Function
 *
 * Accepts POST with standard request contract, calls OpenAI, returns canonical envelope.
 * Uses OPENAI_API_KEY, OPENAI_MODEL_DEFAULT, OPENAI_MODEL_DEEP from Supabase secrets.
 */

import { parseRequestBody } from "./parse.ts";
import { runAnalysis, type EdgeAiErrorCode } from "./run-analysis.ts";

type EdgeErrorResponse = {
  error: string;
  code: EdgeAiErrorCode | "INVALID_REQUEST";
  raw_results?: unknown;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed", code: "INVALID_REQUEST" }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Request body is not valid JSON", code: "INVALID_REQUEST" }, 400);
  }

  let analysisReq;
  try {
    analysisReq = parseRequestBody(body);
  } catch (err) {
    return json(
      {
        error: err instanceof Error ? err.message : "Invalid request",
        code: "INVALID_REQUEST",
      },
      400,
    );
  }

  try {
    const response = await runAnalysis(analysisReq);
    return json(response, 200);
  } catch (err) {
    const body: EdgeErrorResponse = {
      error: err instanceof Error ? err.message : "Analysis failed",
      code: "ANALYSIS_FAILED",
    };
    let status = 500;

    if (err && typeof err === "object" && "code" in err && "status" in err) {
      body.code = (err as { code: EdgeErrorResponse["code"] }).code;
      status = (err as { status: number }).status;
    } else if (err instanceof Error) {
      body.code = "INVALID_REQUEST";
      status = 400;
    }

    if (err && typeof err === "object" && "rawResults" in err) {
      body.raw_results = (err as Error & { rawResults?: unknown }).rawResults;
    }

    return json(body, status);
  }
});
