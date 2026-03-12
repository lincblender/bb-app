/// <reference lib="deno.ns" />

import OpenAI from "npm:openai";
import { SOCIAL_SEARCH_INSTRUCTIONS } from "./prompt.ts";
import type { OrganisationSocialSearchRequest } from "./schema.ts";
import {
  organisationSocialSearchResultsJsonSchema,
  organisationSocialSearchResultsSchema,
} from "./schema.ts";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_OUTPUT_TOKENS = 600;

interface SocialSearchCaller {
  userId?: string;
}

function getClient() {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  return new OpenAI({ apiKey });
}

function getModel() {
  return (
    Deno.env.get("OPENAI_MODEL_SEARCH")?.trim() ||
    Deno.env.get("OPENAI_MODEL_DEFAULT")?.trim() ||
    DEFAULT_MODEL
  );
}

export async function runSocialSearch(
  request: OrganisationSocialSearchRequest,
  caller?: SocialSearchCaller
) {
  const openai = getClient();
  const model = getModel();

  const context = [
    `Platform: ${request.platform}`,
    `Search query: ${request.searchQuery}`,
    ...(request.companyName ? [`Company name (context): ${request.companyName}`] : []),
  ].join("\n");

  const response = await openai.responses.create({
    model,
    instructions: SOCIAL_SEARCH_INSTRUCTIONS,
    input: `Find official ${request.platform} profile(s) for:\n${context}`,
    max_output_tokens: DEFAULT_OUTPUT_TOKENS,
    ...(caller?.userId ? { user: caller.userId } : {}),
    tools: [
      {
        type: "web_search_preview",
        user_location: { type: "approximate", country: "AU" },
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "social_search_matches",
        strict: true,
        schema: organisationSocialSearchResultsJsonSchema,
      },
    },
  });

  if (!response.output_text) {
    return { matches: [] };
  }

  try {
    const parsed = organisationSocialSearchResultsSchema.parse(
      JSON.parse(response.output_text)
    );
    return { matches: parsed.matches.slice(0, 3) };
  } catch {
    return { matches: [] };
  }
}
