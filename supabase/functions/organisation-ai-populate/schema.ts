import { z } from "npm:zod";

const socialProfileSchema = z.object({
  platform: z.enum([
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
  ]),
  url: z.string().trim().default(""),
  handle: z.string().trim().default(""),
  follows: z.number().int().nullable().optional().default(null),
  followers: z.number().int().nullable().optional().default(null),
  lastPostDate: z.string().trim().default(""),
});

const capabilitySchema = z.object({
  name: z.string().trim().default(""),
  category: z.string().trim().default("General"),
});

const certificationSchema = z.object({
  name: z.string().trim().default(""),
  issuer: z.string().trim().default(""),
});

const individualQualificationSchema = z.object({
  name: z.string().trim().default(""),
  issuer: z.string().trim().default(""),
  count: z.number().int().min(1).default(1),
  holderNames: z.array(z.string().trim()).default([]),
});

const caseStudySchema = z.object({
  title: z.string().trim().default(""),
  client: z.string().trim().default(""),
  outcome: z.string().trim().default(""),
});

export const organisationPopulateRequestSchema = z
  .object({
    companyName: z.string().trim().optional().default(""),
    websiteUrl: z.string().trim().optional().default(""),
    linkedinUrl: z.string().trim().optional().default(""),
  })
  .refine(
    (value) =>
      value.companyName.length > 0 || value.websiteUrl.length > 0 || value.linkedinUrl.length > 0,
    {
      message: "Provide a company name, website URL, or LinkedIn company URL.",
      path: ["companyName"],
    }
  );

export const organisationPopulateProfileSchema = z.object({
  name: z.string().trim().default(""),
  description: z.string().trim().default(""),
  websiteUrl: z.string().trim().default(""),
  linkedinUrl: z.string().trim().default(""),
  logoUrl: z.string().trim().default(""),
  location: z.string().trim().default(""),
  socialProfiles: z.array(socialProfileSchema).default([]),
  sectors: z.array(z.string()).default([]),
  capabilities: z.array(capabilitySchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  individualQualifications: z.array(individualQualificationSchema).default([]),
  caseStudies: z.array(caseStudySchema).default([]),
  strategicPreferences: z.array(z.string()).default([]),
  targetMarkets: z.array(z.string()).default([]),
  partnerGaps: z.array(z.string()).default([]),
});

export type OrganisationPopulateRequest = z.infer<typeof organisationPopulateRequestSchema>;
export type OrganisationPopulateProfile = z.infer<typeof organisationPopulateProfileSchema>;

export const organisationPopulateProfileJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "description",
    "websiteUrl",
    "linkedinUrl",
    "logoUrl",
    "location",
    "socialProfiles",
    "sectors",
    "capabilities",
    "certifications",
    "individualQualifications",
    "caseStudies",
    "strategicPreferences",
    "targetMarkets",
    "partnerGaps",
  ],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    websiteUrl: { type: "string" },
    linkedinUrl: { type: "string" },
    logoUrl: { type: "string" },
    location: { type: "string" },
    socialProfiles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "platform",
          "url",
          "handle",
          "follows",
          "followers",
          "lastPostDate",
        ],
        properties: {
          platform: {
            type: "string",
            enum: [
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
            ],
          },
          url: { type: "string" },
          handle: { type: "string" },
          follows: { type: ["number", "null"] },
          followers: { type: ["number", "null"] },
          lastPostDate: { type: "string" },
        },
      },
    },
    sectors: {
      type: "array",
      items: { type: "string" },
    },
    capabilities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "category"],
        properties: {
          name: { type: "string" },
          category: { type: "string" },
        },
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "issuer"],
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
        },
      },
    },
    individualQualifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "issuer", "count", "holderNames"],
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          count: { type: "number" },
          holderNames: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    caseStudies: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "client", "outcome"],
        properties: {
          title: { type: "string" },
          client: { type: "string" },
          outcome: { type: "string" },
        },
      },
    },
    strategicPreferences: {
      type: "array",
      items: { type: "string" },
    },
    targetMarkets: {
      type: "array",
      items: { type: "string" },
    },
    partnerGaps: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;
