import { z } from "npm:zod";
import { getCallerMetadata, jsonResponse } from "./auth.ts";
import { normaliseOrganisationPopulateProfile } from "./normalise.ts";
import { formatOrganisationAiError, runOrganisationAiPopulate } from "./openai.ts";
import { organisationPopulateRequestSchema } from "./schema.ts";

export async function handleOrganisationAiPopulate(request: Request) {
  const caller = getCallerMetadata(request);

  let populateInput: z.infer<typeof organisationPopulateRequestSchema>;
  try {
    const body = await request.json();
    populateInput = organisationPopulateRequestSchema.parse(body);
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof z.ZodError
            ? error.issues[0]?.message ?? "Organisation populate request is invalid."
            : "Organisation populate request is invalid.",
      },
      400
    );
  }

  const lookupPrompt = [
    populateInput.companyName ? `Company name: ${populateInput.companyName}` : null,
    populateInput.websiteUrl ? `Company website: ${populateInput.websiteUrl}` : null,
    populateInput.linkedinUrl ? `LinkedIn company URL: ${populateInput.linkedinUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const profile = normaliseOrganisationPopulateProfile(
      await runOrganisationAiPopulate(
        `Prepare a procurement-oriented organisation profile from these identifiers:\n${lookupPrompt}`,
        caller
      ),
      populateInput
    );

    return jsonResponse({ profile });
  } catch (error) {
    console.error("[organisation-ai-populate:request]", {
      caller,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return jsonResponse(
      {
        error: formatOrganisationAiError(
          error,
          "BidBlender AI could not prepare the organisation profile."
        ),
      },
      500
    );
  }
}
