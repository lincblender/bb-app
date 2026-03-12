/// <reference lib="deno.ns" />

import OpenAI from "npm:openai";
import { ORGANISATION_SEARCH_INSTRUCTIONS } from "./prompt.ts";
import {
  organisationSearchResultsJsonSchema,
  organisationSearchResultsSchema,
} from "./schema.ts";

const DEFAULT_ORGANISATION_SEARCH_MODEL = "gpt-4o-mini";
const DEFAULT_OUTPUT_TOKENS = 1200;
const RETRY_OUTPUT_TOKENS = 1800;
const OPENAI_AUTH_ERROR =
  "BidBlender AI could not authenticate with OpenAI. Update OPENAI_API_KEY in the active environment.";
const OPENAI_WEB_SEARCH_ERROR =
  "BidBlender AI could not use OpenAI web search with the current server configuration. Check the deployed model and project permissions.";
const OPENAI_MODEL_ERROR =
  "BidBlender AI could not access the configured OpenAI model. Check OPENAI_MODEL_SEARCH / OPENAI_MODEL_DEFAULT in the active environment.";

interface OrganisationAiErrorDetails {
  status: number | null;
  code: string;
  message: string;
  type: string;
  name: string;
}

interface OrganisationSearchCaller {
  userId?: string;
}

function getOrganisationSearchClient() {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  return new OpenAI({ apiKey });
}

function getOrganisationSearchModel() {
  return (
    Deno.env.get("OPENAI_MODEL_SEARCH")?.trim() ||
    Deno.env.get("OPENAI_MODEL_DEFAULT")?.trim() ||
    DEFAULT_ORGANISATION_SEARCH_MODEL
  );
}

function getOrganisationAiErrorDetails(error: unknown): OrganisationAiErrorDetails {
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : null;
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const type =
    typeof error === "object" && error && "type" in error
      ? String((error as { type?: unknown }).type ?? "")
      : "";
  const name =
    typeof error === "object" && error && "name" in error
      ? String((error as { name?: unknown }).name ?? "")
      : "Error";

  return { status, code, message, type, name };
}

function isOrganisationAuthError(details: OrganisationAiErrorDetails) {
  const combined = `${details.code} ${details.message}`.toLowerCase();
  return (
    combined.includes("incorrect api key") ||
    combined.includes("invalid api key") ||
    combined.includes("invalid_api_key") ||
    (combined.includes("api key") && combined.includes("missing")) ||
    (details.status === 401 && /bearer|token|credentials?/.test(combined))
  );
}

function isOrganisationModelAccessError(details: OrganisationAiErrorDetails) {
  const combined = `${details.code} ${details.message}`.toLowerCase();
  return (
    /model|does not exist|not found|access to .*model|permission.*model/.test(combined) ||
    combined.includes("model_not_found")
  );
}

function isOrganisationWebSearchError(details: OrganisationAiErrorDetails) {
  const combined = `${details.code} ${details.message}`.toLowerCase();
  return (
    /web[_ -]?search|tool|tools|preview/.test(combined) &&
    /access|permission|unsupported|enabled|available|allow/.test(combined)
  );
}

function shouldRetryWithFallbackModel(error: unknown, model: string) {
  if (model === DEFAULT_ORGANISATION_SEARCH_MODEL) {
    return false;
  }

  const details = getOrganisationAiErrorDetails(error);
  if (details.status === null || ![400, 401, 403, 404].includes(details.status)) {
    return false;
  }

  return isOrganisationModelAccessError(details) || isOrganisationWebSearchError(details);
}

function shouldRetryWithoutWeb(error: unknown) {
  const details = getOrganisationAiErrorDetails(error);
  if (details.status === null || ![400, 401, 403].includes(details.status)) {
    return false;
  }

  return isOrganisationWebSearchError(details);
}

function logOrganisationAiError(
  scope: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  const details = getOrganisationAiErrorDetails(error);
  console.error(`[organisation-ai-search:${scope}]`, {
    ...details,
    ...(context ?? {}),
  });
}

async function requestOrganisationSearch(
  openai: OpenAI,
  query: string,
  model: string,
  useWebSearch = true,
  maxOutputTokens = DEFAULT_OUTPUT_TOKENS,
  caller?: OrganisationSearchCaller
) {
  return openai.responses.create({
    model,
    instructions: ORGANISATION_SEARCH_INSTRUCTIONS,
    input: `Find likely organisation matches for this identifier:\n${query}`,
    max_output_tokens: maxOutputTokens,
    ...(caller?.userId ? { user: caller.userId } : {}),
    ...(useWebSearch
      ? {
          tools: [
            {
              type: "web_search_preview",
              user_location: {
                type: "approximate",
                country: "AU",
              },
            },
          ],
        }
      : {}),
    text: {
      format: {
        type: "json_schema",
        name: "organisation_search_candidates",
        strict: true,
        schema: organisationSearchResultsJsonSchema,
      },
    },
  });
}

function isTruncationErrorMessage(message: string) {
  return /unterminated string|unexpected end|truncated|max_output_tokens/i.test(message);
}

function parseOrganisationSearchResponse(response: Awaited<ReturnType<OpenAI["responses"]["create"]>>) {
  if (!response.output_text) {
    if (response.incomplete_details?.reason === "max_output_tokens") {
      throw new Error("OpenAI response was truncated by max_output_tokens.");
    }
    throw new Error("OpenAI returned no organisation candidates.");
  }

  try {
    return organisationSearchResultsSchema.parse(JSON.parse(response.output_text)).candidates;
  } catch (error) {
    if (
      error instanceof SyntaxError &&
      (response.incomplete_details?.reason === "max_output_tokens" ||
        isTruncationErrorMessage(error.message))
    ) {
      throw new Error("OpenAI response was truncated before JSON completed.");
    }
    throw error;
  }
}

function shouldRetryWithMoreOutputBudget(error: unknown) {
  const details = getOrganisationAiErrorDetails(error);
  return details.status === null && isTruncationErrorMessage(details.message);
}

export async function runOrganisationAiSearch(
  query: string,
  caller?: OrganisationSearchCaller
) {
  const openai = getOrganisationSearchClient();
  const configuredModel = getOrganisationSearchModel();

  try {
    const response = await requestOrganisationSearch(
      openai,
      query,
      configuredModel,
      true,
      DEFAULT_OUTPUT_TOKENS,
      caller
    );
    return parseOrganisationSearchResponse(response);
  } catch (error) {
    let resolvedError = error;
    let resolvedModel = configuredModel;
    let resolvedBudget = DEFAULT_OUTPUT_TOKENS;

    logOrganisationAiError("primary", error, {
      model: configuredModel,
      webSearch: true,
      maxOutputTokens: DEFAULT_OUTPUT_TOKENS,
    });

    if (shouldRetryWithMoreOutputBudget(error)) {
      resolvedBudget = RETRY_OUTPUT_TOKENS;
      try {
        const response = await requestOrganisationSearch(
          openai,
          query,
          configuredModel,
          true,
          resolvedBudget,
          caller
        );
        return parseOrganisationSearchResponse(response);
      } catch (retryError) {
        resolvedError = retryError;
        logOrganisationAiError("retry-larger-budget", retryError, {
          model: configuredModel,
          webSearch: true,
          maxOutputTokens: resolvedBudget,
        });
      }
    }

    if (shouldRetryWithFallbackModel(error, configuredModel)) {
      resolvedModel = DEFAULT_ORGANISATION_SEARCH_MODEL;
      try {
        const response = await requestOrganisationSearch(
          openai,
          query,
          resolvedModel,
          true,
          resolvedBudget,
          caller
        );
        return parseOrganisationSearchResponse(response);
      } catch (fallbackError) {
        resolvedError = fallbackError;
        logOrganisationAiError("fallback-model", fallbackError, {
          model: resolvedModel,
          webSearch: true,
          maxOutputTokens: resolvedBudget,
        });
      }
    }

    if (shouldRetryWithoutWeb(resolvedError)) {
      try {
        const response = await requestOrganisationSearch(
          openai,
          query,
          resolvedModel,
          false,
          resolvedBudget,
          caller
        );
        return parseOrganisationSearchResponse(response);
      } catch (fallbackError) {
        resolvedError = fallbackError;
        logOrganisationAiError("fallback-no-web", fallbackError, {
          model: resolvedModel,
          webSearch: false,
          maxOutputTokens: resolvedBudget,
        });
      }
    }

    throw resolvedError;
  }
}

export function formatOrganisationAiError(error: unknown, fallback: string) {
  const details = getOrganisationAiErrorDetails(error);

  if (isOrganisationAuthError(details)) {
    return OPENAI_AUTH_ERROR;
  }

  if (isOrganisationModelAccessError(details)) {
    return OPENAI_MODEL_ERROR;
  }

  if (isOrganisationWebSearchError(details)) {
    return OPENAI_WEB_SEARCH_ERROR;
  }

  if (details.status === 429 || /rate limit/i.test(details.message)) {
    return "BidBlender AI is rate limited right now. Try again shortly.";
  }

  if (details.status !== null && details.status >= 500) {
    return "OpenAI is temporarily unavailable for organisation research. Try again shortly.";
  }

  return details.message || fallback;
}
