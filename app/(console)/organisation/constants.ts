/** Page-level content */
export const PAGE_CONTENT = {
  title: "Organisation Profile",
  description:
    "Capture the capability evidence BidBlender should use for qualification. Fill it out directly, or use BidBlender AI to find the right company first and then draft a lean profile from public sources.",
  loading: "Loading organisation profile…",
} as const;

/** Notice messages */
export const NOTICE_MESSAGES = {
  saveSuccess: "Organisation profile saved.",
  deleteSuccess: "Organisation profile deleted.",
  saveError: "Organisation profile could not be saved.",
  deleteError: "Organisation profile could not be deleted.",
  aiSuccess: "BidBlender AI drafted the profile. Save it from the card at bottom right when ready.",
  aiError: "BidBlender AI could not populate the organisation profile.",
  aiSearchError: "BidBlender AI could not search for the organisation.",
  aiNoMatches:
    "BidBlender AI could not find a confident match. Try the official website or LinkedIn company page.",
} as const;

/** API endpoints */
export const API_ENDPOINTS = {
  profile: "/api/organisation/profile",
  profileAi: "/api/organisation/profile/ai",
  profileAiSearch: "/api/organisation/profile/ai/search",
  profileAiSocialSearch: "/api/organisation/profile/ai/social-search",
  profileAiInferFromWebsite: "/api/organisation/profile/ai/infer-from-website",
} as const;

/** Section content */
export const SECTIONS = {
  basics: {
    title: "Organisation Basics",
    description:
      "Enter the core profile directly, or use BidBlender AI to confirm the right company and draft the essentials from public sources.",
  },
  capabilityEvidence: {
    title: "Capability Evidence",
  },
  marketPosition: {
    title: "Market Position",
  },
  caseStudies: {
    title: "Case Studies",
    description:
      "Keep these short and factual. BidBlender should be able to match them against live opportunities.",
  },
  save: {
    title: "Save",
    description:
      "Save the curated profile once the basics look right. This is the capability source for the four-pillar setup.",
  },
  whatGoodLooksLike: {
    title: "What Good Looks Like",
    tips: [
      "Keep the profile lean and evidentiary, not a copy of the company website.",
      "Use capabilities, certifications, and case studies that help qualify real tenders.",
      "Let BidBlender AI draft first, but review and tighten before saving.",
    ],
  },
  nextStep: {
    title: "Next Step",
    description:
      "Once the profile is saved, return to the connectors view and the capability pillar should move out of `Next`.",
    linkText: "Back to four pillars",
    linkHref: "/connectors",
  },
} as const;

/** Field labels and placeholders */
export const FIELDS = {
  organisationName: {
    label: "Organisation name",
    placeholder: "Acme Consulting",
  },
  companyWebsite: {
    label: "Company website",
    placeholder: "https://www.example.com.au",
  },
  linkedinUrl: {
    label: "LinkedIn company URL",
    placeholder: "https://www.linkedin.com/company/example",
  },
  companyDescription: {
    label: "Company description",
    placeholder:
      "Describe what the organisation does, in plain procurement-relevant language.",
  },
  sectorsServed: {
    label: "Sectors served",
    placeholder: "Defence\nHealth\nDigital transformation",
  },
  targetMarkets: {
    label: "Target markets",
    placeholder: "Federal government\nState agencies\nUtilities",
  },
  strategicPreferences: {
    label: "Strategic preferences",
    placeholder:
      "Prime where delivery leadership matters\nAvoid low-margin body-shop work",
  },
  partnerGaps: {
    label: "Partner gaps",
    placeholder: "Civil construction delivery\nRegional field maintenance",
  },
  capability: {
    name: "Capability name",
    category: "Category",
  },
  orgCertification: {
    name: "Certification",
    issuer: "Issuer",
  },
  individualQualification: {
    name: "Qualification (e.g. AWS Solutions Architect)",
    issuer: "Issuer (e.g. AWS)",
    count: "Count",
    holderNames: "Holder names (optional)",
  },
  caseStudy: {
    title: "Case study title",
    client: "Client",
    outcome: "Outcome, scope, and relevant procurement evidence.",
  },
} as const;

/** Button labels */
export const BUTTONS = {
  useAi: "Use BidBlender AI",
  resyncAi: "Re-sync to AI",
  deleteOrganisation: "Delete organisation",
  search: "Search",
  searching: "Searching...",
  select: "Select",
  noneOfThese: "None of these?",
  cancel: "Close",
  addCapability: "Add capability",
  addOrgCertification: "Add organisation certification",
  addIndividualQualification: "Add individual qualification",
  addCaseStudy: "Add case study",
  saveProfile: "Save profile",
  saving: "Saving...",
  saved: "Saved",
  deleting: "Deleting...",
  removeCapability: "Remove capability",
  removeOrgCertification: "Remove organisation certification",
  removeIndividualQualification: "Remove individual qualification",
  removeCaseStudy: "Remove case study",
} as const;

/** Empty state messages */
export const EMPTY_STATES = {
  capabilities: "No capabilities added yet.",
  orgCertifications: "No organisation certifications added yet.",
  individualQualifications: "No individual qualifications added yet.",
  caseStudies: "No case studies added yet.",
} as const;

/** AI helper text */
export const AI_HELPER_TEXT =
  "Uses OpenAI credits and public web search. BidBlender AI now confirms the right company before it drafts the profile.";

export const AI_MODAL = {
  title: "What is your company name?",
  hint: "hint: get faster results with your url or linkedin page",
  placeholder: "Acme Consulting or https://www.acme.com.au",
  emptyLocation: "Location not found yet",
} as const;

export const AI_ACTION_WARNINGS = {
  creditCostNote:
    "This action can consume BidBlender AI credits. Final credit pricing copy can be tightened as the billing model is finalised.",
  resync: {
    title: "Re-sync this profile with BidBlender AI?",
    description:
      "BidBlender AI will re-research the organisation and may overwrite curated fields with fresher public-source data.",
    confirmLabel: "Continue to AI re-sync",
    destructive: false,
  },
  delete: {
    title: "Delete this organisation profile?",
    description:
      "Deleting removes the saved organisation profile. Rebuilding it later may require another AI pass and additional credits.",
    confirmLabel: "Delete organisation",
    destructive: true,
  },
  unsavedChangesDeleteNote:
    "You still have unsaved changes. Deleting now will discard those local edits.",
  unsavedChangesResyncNote:
    "You still have unsaved changes. If you continue through AI re-sync, those local edits may be overwritten.",
} as const;

import {
  CAPABILITY_CATEGORIES,
  CAPABILITY_NAMES,
  ORG_CERTIFICATIONS,
  ORG_CERT_ISSUERS,
  SECTORS,
  TARGET_MARKETS,
} from "@/lib/organisation/suggestions";

/** Default values for new list items */
export const DEFAULTS = {
  capabilityCategory: "General",
} as const;

/** Config for list item sections (capabilities, certifications, case studies) */
export const LIST_SECTION_CONFIGS = [
  {
    id: "capabilities",
    subtitle: "Capabilities",
    hideSubtitle: false,
    variant: "badge" as const,
    addLabel: "addCapability",
    emptyLabel: "capabilities",
    removeLabel: "removeCapability",
    gridCols: "1fr 0.6fr auto",
    rowFields: [
      {
        key: "name" as const,
        placeholder: FIELDS.capability.name,
        suggestions: [...CAPABILITY_NAMES],
      },
      {
        key: "category" as const,
        placeholder: FIELDS.capability.category,
        suggestions: [...CAPABILITY_CATEGORIES],
      },
    ],
    bottomField: null,
  },
  {
    id: "certifications",
    subtitle: "Organisation certifications",
    hideSubtitle: false,
    addLabel: "addOrgCertification",
    emptyLabel: "orgCertifications",
    removeLabel: "removeOrgCertification",
    gridCols: "1fr 0.8fr auto",
    rowFields: [
      {
        key: "name" as const,
        placeholder: FIELDS.orgCertification.name,
        suggestions: [...ORG_CERTIFICATIONS],
      },
      {
        key: "issuer" as const,
        placeholder: FIELDS.orgCertification.issuer,
        suggestions: [...ORG_CERT_ISSUERS],
      },
    ],
    bottomField: null,
  },
  {
    id: "caseStudies",
    subtitle: "",
    hideSubtitle: true,
    addLabel: "addCaseStudy",
    emptyLabel: "caseStudies",
    removeLabel: "removeCaseStudy",
    gridCols: "1fr 0.8fr auto",
    rowFields: [
      { key: "title" as const, placeholder: FIELDS.caseStudy.title },
      { key: "client" as const, placeholder: FIELDS.caseStudy.client },
    ],
    bottomField: {
      key: "outcome" as const,
      placeholder: FIELDS.caseStudy.outcome,
      rows: 3,
    },
  },
] as const;

/** Config for textarea list fields (sectors, target markets, etc.) */
export const TEXTAREA_LIST_FIELDS = [
  { key: "sectors" as const, ...FIELDS.sectorsServed, suggestions: [...SECTORS] },
  {
    key: "targetMarkets" as const,
    ...FIELDS.targetMarkets,
    suggestions: [...TARGET_MARKETS],
  },
  { key: "strategicPreferences" as const, ...FIELDS.strategicPreferences },
  { key: "partnerGaps" as const, ...FIELDS.partnerGaps },
] as const;
