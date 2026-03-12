import { z } from "npm:zod";
import { getCallerMetadata, jsonResponse } from "./auth.ts";
import { dedupeOrganisationSearchCandidates } from "./normalise.ts";
import { formatOrganisationAiError, runOrganisationAiSearch } from "./openai.ts";
import { organisationSearchRequestSchema } from "./schema.ts";

export async function handleOrganisationAiSearch(request: Request) {
  const caller = getCallerMetadata(request);

  let searchInput: z.infer<typeof organisationSearchRequestSchema>;
  try {
    const body = await request.json();
    searchInput = organisationSearchRequestSchema.parse(body);
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof z.ZodError
            ? error.issues[0]?.message ?? "Organisation search request is invalid."
            : "Organisation search request is invalid.",
      },
      400
    );
  }

  try {
    const candidates = dedupeOrganisationSearchCandidates(
      await runOrganisationAiSearch(searchInput.query, caller)
    ).filter(
      (candidate) =>
        candidate.confidence >= 35 ||
        candidate.websiteUrl.length > 0 ||
        candidate.linkedinUrl.length > 0
    );

    return jsonResponse({ candidates });
  } catch (error) {
    console.error("[organisation-ai-search:request]", {
      caller,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return jsonResponse(
      {
        error: formatOrganisationAiError(
          error,
          "BidBlender AI could not search for the organisation."
        ),
      },
      500
    );
  }
}
