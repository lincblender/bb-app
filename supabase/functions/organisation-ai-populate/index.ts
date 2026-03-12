/// <reference lib="deno.ns" />

import { corsHeaders, jsonResponse } from "./auth.ts";
import { handleOrganisationAiPopulate } from "./handler.ts";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  return handleOrganisationAiPopulate(request);
});
