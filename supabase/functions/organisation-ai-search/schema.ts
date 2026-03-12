import { z } from "npm:zod";

export const organisationSearchRequestSchema = z.object({
  query: z.string().trim().min(1, "Provide a company name, website URL, or LinkedIn company URL."),
});

export const organisationSearchCandidateSchema = z.object({
  name: z.string().trim().default(""),
  websiteUrl: z.string().trim().default(""),
  linkedinUrl: z.string().trim().default(""),
  logoUrl: z.string().trim().default(""),
  location: z.string().trim().default(""),
  confidence: z.number().min(0).max(100).default(0),
});

export const organisationSearchResultsSchema = z.object({
  candidates: z.array(organisationSearchCandidateSchema).default([]),
});

export type OrganisationSearchCandidate = z.infer<typeof organisationSearchCandidateSchema>;

export const organisationSearchResultsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["candidates"],
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "websiteUrl", "linkedinUrl", "logoUrl", "location", "confidence"],
        properties: {
          name: { type: "string" },
          websiteUrl: { type: "string" },
          linkedinUrl: { type: "string" },
          logoUrl: { type: "string" },
          location: { type: "string" },
          confidence: { type: "number" },
        },
      },
    },
  },
} as const;
