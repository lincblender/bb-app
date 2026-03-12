import type { OrganisationSearchCandidate } from "./schema.ts";

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

function canonicaliseComparableUrl(value: string) {
  const normalised = normaliseUrl(value);
  if (!normalised) {
    return "";
  }

  try {
    const url = new URL(normalised);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();

    if (!pathname || pathname === "/") {
      return host;
    }

    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
      const companyMatch = pathname.match(/^\/company\/([^/]+)/);
      if (companyMatch) {
        return `linkedin.com/company/${companyMatch[1]}`;
      }
    }

    return `${host}${pathname}`;
  } catch {
    return normalised
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  }
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

function normaliseOrganisationSearchCandidate(
  candidate: OrganisationSearchCandidate
): OrganisationSearchCandidate {
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

function getCandidateIdentityTokens(candidate: OrganisationSearchCandidate) {
  const tokens = [
    candidate.websiteUrl
      ? `website:${canonicaliseComparableUrl(candidate.websiteUrl)}`
      : "",
    candidate.linkedinUrl
      ? `linkedin:${canonicaliseComparableUrl(candidate.linkedinUrl)}`
      : "",
  ].filter((value) => value.length > 0);

  if (tokens.length > 0) {
    return tokens;
  }

  return [
    `name:${candidate.name.trim().toLowerCase()}`,
    `location:${candidate.location.trim().toLowerCase()}`,
  ];
}

function getCandidateCompletenessScore(candidate: OrganisationSearchCandidate) {
  return [
    candidate.websiteUrl,
    candidate.linkedinUrl,
    candidate.logoUrl,
    candidate.location,
    candidate.name,
  ].filter((value) => value.trim().length > 0).length;
}

function mergeCandidates(
  left: OrganisationSearchCandidate,
  right: OrganisationSearchCandidate
) {
  const leftScore = getCandidateCompletenessScore(left);
  const rightScore = getCandidateCompletenessScore(right);
  const preferred =
    right.confidence > left.confidence ||
    (right.confidence === left.confidence && rightScore > leftScore)
      ? right
      : left;
  const secondary = preferred === right ? left : right;

  return {
    name: preferred.name || secondary.name,
    websiteUrl: preferred.websiteUrl || secondary.websiteUrl,
    linkedinUrl: preferred.linkedinUrl || secondary.linkedinUrl,
    logoUrl: preferred.logoUrl || secondary.logoUrl,
    location: preferred.location || secondary.location,
    confidence: Math.max(left.confidence, right.confidence),
  };
}

export function dedupeOrganisationSearchCandidates(
  candidates: OrganisationSearchCandidate[]
) {
  const deduped: OrganisationSearchCandidate[] = [];

  return candidates
    .map(normaliseOrganisationSearchCandidate)
    .filter((candidate) => candidate.name.length > 0)
    .reduce((results, candidate) => {
      const tokens = getCandidateIdentityTokens(candidate);
      const existingIndex = results.findIndex((existing) => {
        const existingTokens = getCandidateIdentityTokens(existing);
        return tokens.some((token) => existingTokens.includes(token));
      });

      if (existingIndex === -1) {
        results.push(candidate);
        return results;
      }

      results[existingIndex] = mergeCandidates(results[existingIndex], candidate);
      return results;
    }, deduped)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5);
}
