import { z } from "npm:zod";

export const socialSearchPlatformSchema = z.enum([
  "linkedin",
  "youtube",
  "instagram",
  "facebook",
  "x",
  "tiktok",
  "google_business",
  "github",
  "threads",
  "pinterest",
  "crunchbase",
]);

export const organisationSocialSearchRequestSchema = z.object({
  platform: socialSearchPlatformSchema,
  searchQuery: z.string().trim().min(1, "Provide a search query (company name or handle)."),
  companyName: z.string().trim().optional().default(""),
});

export const socialSearchMatchSchema = z.object({
  url: z.string().trim().default(""),
  handle: z.string().trim().default(""),
});

export const organisationSocialSearchResultsSchema = z.object({
  matches: z.array(socialSearchMatchSchema).default([]),
});

export type OrganisationSocialSearchRequest = z.infer<
  typeof organisationSocialSearchRequestSchema
>;
export type SocialSearchMatch = z.infer<typeof socialSearchMatchSchema>;

export const organisationSocialSearchResultsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["matches"],
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["url", "handle"],
        properties: {
          url: { type: "string" },
          handle: { type: "string" },
        },
      },
    },
  },
} as const;
