/**
 * BidBlender AI Analysis Job - Supabase Edge Function
 *
 * Accepts POST with standard request contract, calls OpenAI, returns canonical envelope.
 * Uses OPENAI_API_KEY, OPENAI_MODEL_DEFAULT, OPENAI_MODEL_DEEP from Supabase secrets.
 */

import { parseRequestBody } from "./parse.ts";
import { runAnalysis } from "./run-analysis.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const analysisReq = parseRequestBody(body);
    const response = await runAnalysis(analysisReq);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    const body: Record<string, unknown> = { error: message };
    if (err && typeof err === "object" && "rawResults" in err) {
      body.raw_results = (err as Error & { rawResults?: unknown }).rawResults;
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
});
