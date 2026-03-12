import { z } from "npm:zod";
import { getCallerMetadata, jsonResponse } from "./auth.ts";
import { runSocialSearch } from "./openai.ts";
import { organisationSocialSearchRequestSchema } from "./schema.ts";

export async function handleSocialSearch(request: Request) {
  const caller = getCallerMetadata(request);

  let input: z.infer<typeof organisationSocialSearchRequestSchema>;
  try {
    const body = await request.json();
    input = organisationSocialSearchRequestSchema.parse(body);
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof z.ZodError
            ? error.issues[0]?.message ?? "Social search request is invalid."
            : "Social search request is invalid.",
      },
      400
    );
  }

  try {
    const { matches } = await runSocialSearch(input, caller);
    return jsonResponse({ matches });
  } catch (error) {
    console.error("[organisation-ai-social-search:request]", {
      caller,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "BidBlender AI could not search for the social profile.",
      },
      500
    );
  }
}
