import { z } from "zod";
import type { Organisation } from "@/lib/types";

const socialProfileSchema = z.object({
  id: z.string().optional().nullable(),
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
  id: z.string().optional().nullable(),
  name: z.string().trim().min(1, "Capability name is required."),
  category: z.string().trim().default("General"),
});

const orgCertificationSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().trim().min(1, "Certification name is required."),
  issuer: z.string().trim().default(""),
});

const individualQualificationSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().trim().min(1, "Qualification name is required."),
  issuer: z.string().trim().default(""),
  count: z.number().int().min(1).default(1),
  holderNames: z.array(z.string().trim()).optional().default([]),
});

const caseStudySchema = z.object({
  id: z.string().optional().nullable(),
  title: z.string().trim().min(1, "Case study title is required."),
  client: z.string().trim().default(""),
  outcome: z.string().trim().default(""),
});

function normaliseStringList(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function normaliseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^[\w.-]+\.[A-Za-z]{2,}/.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

function normaliseDateString(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

const unspscCodeSchema = z.object({
  code: z.string().trim().default(""),
  description: z.string().trim().default(""),
  confidence: z.enum(["stated", "inferred"]).optional(),
});

const governmentPanelSchema = z.object({
  name: z.string().trim().default(""),
  jurisdiction: z.string().trim().default(""),
  status: z.enum(["confirmed", "likely"]).default("likely"),
});

export const organisationProfileSaveSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().trim().min(1, "Organisation name is required."),
  description: z.string().trim().default(""),
  websiteUrl: z.string().trim().default(""),
  linkedinUrl: z.string().trim().default(""),
  logoUrl: z.string().trim().default(""),
  location: z.string().trim().default(""),
  socialProfiles: z.array(socialProfileSchema).default([]),
  sectors: z.array(z.string()).default([]),
  capabilities: z.array(capabilitySchema).default([]),
  certifications: z.array(orgCertificationSchema).default([]),
  individualQualifications: z.array(individualQualificationSchema).default([]),
  caseStudies: z.array(caseStudySchema).default([]),
  strategicPreferences: z.array(z.string()).default([]),
  targetMarkets: z.array(z.string()).default([]),
  partnerGaps: z.array(z.string()).default([]),
  // Government procurement intelligence
  unspscCodes: z.array(unspscCodeSchema).default([]),
  anzsicCode: z.string().trim().nullable().default(null),
  governmentPanels: z.array(governmentPanelSchema).default([]),
  operatingRegions: z.array(z.string()).default([]),
  tenderKeywords: z.array(z.string()).default([]),
});

export const organisationProfileSearchSchema = z.object({
  query: z.string().trim().min(1, "Provide a company name, website URL, or LinkedIn company URL."),
});

export const organisationProfileSearchCandidateSchema = z.object({
  name: z.string().trim().default(""),
  websiteUrl: z.string().trim().default(""),
  linkedinUrl: z.string().trim().default(""),
  logoUrl: z.string().trim().default(""),
  location: z.string().trim().default(""),
  confidence: z.number().min(0).max(100).default(0),
});

export const organisationProfileSearchResultsSchema = z.object({
  candidates: z.array(organisationProfileSearchCandidateSchema).default([]),
});

export const organisationProfileResearchSchema = z
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

export const organisationProfileSuggestionSchema = z.object({
  name: z.string().trim().default(""),
  description: z.string().trim().default(""),
  websiteUrl: z.string().trim().default(""),
  linkedinUrl: z.string().trim().default(""),
  logoUrl: z.string().trim().default(""),
  location: z.string().trim().default(""),
  socialProfiles: z.array(socialProfileSchema.omit({ id: true })).default([]),
  sectors: z.array(z.string()).default([]),
  capabilities: z.array(capabilitySchema.omit({ id: true })).default([]),
  certifications: z.array(orgCertificationSchema.omit({ id: true })).default([]),
  individualQualifications: z
    .array(individualQualificationSchema.omit({ id: true }))
    .default([]),
  caseStudies: z.array(caseStudySchema.omit({ id: true })).default([]),
  strategicPreferences: z.array(z.string()).default([]),
  targetMarkets: z.array(z.string()).default([]),
  partnerGaps: z.array(z.string()).default([]),
});

export type OrganisationProfileSaveInput = z.infer<typeof organisationProfileSaveSchema>;
export type OrganisationProfileSearchInput = z.infer<typeof organisationProfileSearchSchema>;
export type OrganisationProfileSearchCandidate = z.infer<
  typeof organisationProfileSearchCandidateSchema
>;
export type OrganisationProfileResearchInput = z.infer<typeof organisationProfileResearchSchema>;
export type OrganisationProfileSuggestion = z.infer<typeof organisationProfileSuggestionSchema>;

export function createEmptyOrganisationProfile(): OrganisationProfileSaveInput {
  return {
    id: null,
    name: "",
    description: "",
    websiteUrl: "",
    linkedinUrl: "",
    logoUrl: "",
    location: "",
    socialProfiles: [],
    sectors: [],
    capabilities: [],
    certifications: [],
    individualQualifications: [],
    caseStudies: [],
    strategicPreferences: [],
    targetMarkets: [],
    partnerGaps: [],
    unspscCodes: [],
    anzsicCode: null,
    governmentPanels: [],
    operatingRegions: [],
    tenderKeywords: [],
  };
}

export function mapOrganisationToProfile(organisation: Organisation | null | undefined) {
  if (!organisation) {
    return createEmptyOrganisationProfile();
  }

  return {
    id: organisation.id,
    name: organisation.name ?? "",
    description: organisation.description ?? "",
    websiteUrl: organisation.websiteUrl ?? "",
    linkedinUrl: organisation.linkedinUrl ?? "",
    logoUrl: organisation.logoUrl ?? "",
    location: organisation.location ?? "",
    socialProfiles: (organisation.socialProfiles ?? []).map((profile) => ({
      id: profile.id ?? null,
      platform: profile.platform,
      url: profile.url ?? "",
      handle: profile.handle ?? "",
      follows: profile.follows ?? null,
      followers: profile.followers ?? null,
      lastPostDate: profile.lastPostDate ?? "",
    })),
    sectors: organisation.sectors ?? [],
    capabilities: organisation.capabilities ?? [],
    certifications: organisation.certifications ?? [],
    individualQualifications: (organisation.individualQualifications ?? []).map(
      (iq) => ({
        ...iq,
        holderNames: iq.holderNames ?? [],
      })
    ),
    caseStudies: organisation.caseStudies ?? [],
    strategicPreferences: organisation.strategicPreferences ?? [],
    targetMarkets: organisation.targetMarkets ?? [],
    partnerGaps: organisation.partnerGaps ?? [],
    unspscCodes: organisation.unspscCodes ?? [],
    anzsicCode: organisation.anzsicCode ?? null,
    governmentPanels: organisation.governmentPanels ?? [],
    operatingRegions: organisation.operatingRegions ?? [],
    tenderKeywords: organisation.tenderKeywords ?? [],
  };
}

export function normaliseOrganisationProfileInput(input: OrganisationProfileSaveInput) {
  const websiteUrl = normaliseUrl(input.websiteUrl);
  const linkedinUrl = normaliseUrl(input.linkedinUrl);

  return {
    id: input.id ?? null,
    name: input.name.trim(),
    description: input.description.trim(),
    websiteUrl,
    linkedinUrl,
    logoUrl: normaliseUrl(input.logoUrl) || buildOrganisationLogoUrl(websiteUrl),
    location: input.location.trim(),
    socialProfiles: input.socialProfiles
      .map((profile) => ({
        id: profile.id ?? null,
        platform: profile.platform,
        url: normaliseUrl(profile.url),
        handle: profile.handle.trim(),
        follows:
          typeof profile.follows === "number" && Number.isFinite(profile.follows)
            ? Math.max(0, Math.round(profile.follows))
            : null,
        followers:
          typeof profile.followers === "number" && Number.isFinite(profile.followers)
            ? Math.max(0, Math.round(profile.followers))
            : null,
        lastPostDate: normaliseDateString(profile.lastPostDate),
      }))
      .filter((profile) => profile.url.length > 0 || profile.handle.length > 0)
      .map((profile, index) => ({
        id: profile.id ?? `social-profile-${index + 1}`,
        platform: profile.platform,
        url: profile.url,
        handle: profile.handle,
        follows: profile.follows,
        followers: profile.followers,
        lastPostDate: profile.lastPostDate,
      })),
    sectors: normaliseStringList(input.sectors),
    capabilities: input.capabilities
      .map((capability) => ({
        id: capability.id ?? null,
        name: capability.name.trim(),
        category: capability.category.trim() || "General",
      }))
      .filter((capability) => capability.name.length > 0)
      .map((capability, index) => ({
        id: capability.id ?? `capability-${index + 1}`,
        name: capability.name,
        category: capability.category,
      })),
    certifications: input.certifications
      .map((certification) => ({
        id: certification.id ?? null,
        name: certification.name.trim(),
        issuer: certification.issuer.trim(),
      }))
      .filter((certification) => certification.name.length > 0)
      .map((certification, index) => ({
        id: certification.id ?? `certification-${index + 1}`,
        name: certification.name,
        issuer: certification.issuer,
      })),
    individualQualifications: input.individualQualifications
      .map((iq) => ({
        id: iq.id ?? null,
        name: iq.name.trim(),
        issuer: iq.issuer.trim(),
        count: Math.max(1, Math.floor(iq.count)),
        holderNames: (iq.holderNames ?? []).map((n) => n.trim()).filter(Boolean),
      }))
      .filter((iq) => iq.name.length > 0)
      .map((iq, index) => ({
        id: iq.id ?? `individual-qualification-${index + 1}`,
        name: iq.name,
        issuer: iq.issuer,
        count: iq.count,
        holderNames: iq.holderNames,
      })),
    caseStudies: input.caseStudies
      .map((caseStudy) => ({
        id: caseStudy.id ?? null,
        title: caseStudy.title.trim(),
        client: caseStudy.client.trim(),
        outcome: caseStudy.outcome.trim(),
      }))
      .filter((caseStudy) => caseStudy.title.length > 0)
      .map((caseStudy, index) => ({
        id: caseStudy.id ?? `case-study-${index + 1}`,
        title: caseStudy.title,
        client: caseStudy.client,
        outcome: caseStudy.outcome,
      })),
    strategicPreferences: normaliseStringList(input.strategicPreferences),
    targetMarkets: normaliseStringList(input.targetMarkets),
    partnerGaps: normaliseStringList(input.partnerGaps),
    // Government procurement intelligence — passed through as-is
    unspscCodes: input.unspscCodes ?? [],
    anzsicCode: input.anzsicCode ?? null,
    governmentPanels: input.governmentPanels ?? [],
    operatingRegions: normaliseStringList(input.operatingRegions ?? []),
    tenderKeywords: normaliseStringList(input.tenderKeywords ?? []),
  };
}

export function buildOrganisationLogoUrl(websiteUrl: string) {
  const normalised = normaliseUrl(websiteUrl);
  if (!normalised) {
    return "";
  }

  try {
    const url = new URL(normalised);
    return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url.origin)}`;
  } catch {
    return "";
  }
}

export function normaliseOrganisationSearchCandidate(
  candidate: OrganisationProfileSearchCandidate
): OrganisationProfileSearchCandidate {
  const websiteUrl = normaliseUrl(candidate.websiteUrl);

  return {
    name: candidate.name.trim(),
    websiteUrl,
    linkedinUrl: normaliseUrl(candidate.linkedinUrl),
    logoUrl: normaliseUrl(candidate.logoUrl) || buildOrganisationLogoUrl(websiteUrl),
    location: candidate.location.trim(),
    confidence: Math.max(0, Math.min(100, Math.round(candidate.confidence))),
  };
}

export function dedupeOrganisationSearchCandidates(
  candidates: OrganisationProfileSearchCandidate[]
) {
  const seen = new Set<string>();

  return candidates
    .map(normaliseOrganisationSearchCandidate)
    .filter((candidate) => candidate.name.length > 0)
    .filter((candidate) => {
      const key = `${candidate.name.toLowerCase()}::${candidate.websiteUrl.toLowerCase()}::${
        candidate.linkedinUrl.toLowerCase()
      }`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5);
}

export const organisationProfileSearchResultsJsonSchema = {
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

export const organisationProfileSuggestionJsonSchema = {
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
