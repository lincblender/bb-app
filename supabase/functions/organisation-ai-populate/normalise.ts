import type {
  OrganisationPopulateProfile,
  OrganisationPopulateRequest,
} from "./schema.ts";

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

function buildOrganisationLogoUrl(websiteUrl: string) {
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

function deriveHandleFromUrl(value: string) {
  try {
    const url = new URL(value);
    return url.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .at(-1) ?? "";
  } catch {
    return "";
  }
}

export function normaliseOrganisationPopulateProfile(
  profile: OrganisationPopulateProfile,
  request: OrganisationPopulateRequest
) {
  const websiteUrl = normaliseUrl(profile.websiteUrl || request.websiteUrl);
  const linkedinUrl = normaliseUrl(profile.linkedinUrl || request.linkedinUrl);
  const socialProfiles = profile.socialProfiles
    .map((social, index) => ({
      id: `social-profile-${index + 1}`,
      platform: social.platform,
      url: normaliseUrl(social.url),
      handle: social.handle.trim(),
      follows:
        typeof social.follows === "number" && Number.isFinite(social.follows)
          ? Math.max(0, Math.round(social.follows))
          : null,
      followers:
        typeof social.followers === "number" && Number.isFinite(social.followers)
          ? Math.max(0, Math.round(social.followers))
          : null,
      lastPostDate: normaliseDateString(social.lastPostDate),
    }))
    .filter((social) => social.url.length > 0 || social.handle.length > 0);

  if (
    linkedinUrl &&
    !socialProfiles.some(
      (social) => social.platform === "linkedin" && social.url === linkedinUrl
    )
  ) {
    socialProfiles.unshift({
      id: "social-profile-linkedin",
      platform: "linkedin",
      url: linkedinUrl,
      handle: deriveHandleFromUrl(linkedinUrl),
      follows: null,
      followers: null,
      lastPostDate: "",
    });
  }

  return {
    id: null,
    name: profile.name.trim() || request.companyName.trim(),
    description: profile.description.trim(),
    websiteUrl,
    linkedinUrl,
    logoUrl: normaliseUrl(profile.logoUrl) || buildOrganisationLogoUrl(websiteUrl),
    location: profile.location.trim(),
    socialProfiles,
    sectors: normaliseStringList(profile.sectors),
    capabilities: profile.capabilities
      .map((capability, index) => ({
        id: `capability-${index + 1}`,
        name: capability.name.trim(),
        category: capability.category.trim() || "General",
      }))
      .filter((capability) => capability.name.length > 0),
    certifications: profile.certifications
      .map((certification, index) => ({
        id: `certification-${index + 1}`,
        name: certification.name.trim(),
        issuer: certification.issuer.trim(),
      }))
      .filter((certification) => certification.name.length > 0),
    individualQualifications: profile.individualQualifications
      .map((qualification, index) => ({
        id: `individual-qualification-${index + 1}`,
        name: qualification.name.trim(),
        issuer: qualification.issuer.trim(),
        count: Math.max(1, Math.floor(qualification.count)),
        holderNames: qualification.holderNames.map((value) => value.trim()).filter(Boolean),
      }))
      .filter((qualification) => qualification.name.length > 0),
    caseStudies: profile.caseStudies
      .map((caseStudy, index) => ({
        id: `case-study-${index + 1}`,
        title: caseStudy.title.trim(),
        client: caseStudy.client.trim(),
        outcome: caseStudy.outcome.trim(),
      }))
      .filter((caseStudy) => caseStudy.title.length > 0),
    strategicPreferences: normaliseStringList(profile.strategicPreferences),
    targetMarkets: normaliseStringList(profile.targetMarkets),
    partnerGaps: normaliseStringList(profile.partnerGaps),
  };
}
