/**
 * LinkedIn profile extraction and API calls.
 *
 * Three tiers of data, in order of availability:
 *
 *   Tier 1 — OIDC metadata (always available after LinkedIn sign-in)
 *     Supabase stores name, email, picture in user.user_metadata after OIDC sign-in.
 *     No API call needed.
 *
 *   Tier 2 — LinkedIn /userinfo endpoint (OIDC standard, openid+profile+email scopes)
 *     Called with the provider_token from the Supabase client session.
 *     Available when the caller has the provider token (client-side or passed in).
 *     Returns: sub, name, given_name, family_name, email, picture, locale.
 *
 *   Tier 3 — LinkedIn REST /me endpoint (requires r_liteprofile or profile scope)
 *     Called with any valid LinkedIn OAuth2 access token (e.g. company-admin token).
 *     Returns: id, localizedFirstName, localizedLastName, profilePicture, headline.
 *     headline requires r_fullprofile (needs LinkedIn Partner approval) — omitted.
 */

const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_REST_BASE_URL = process.env.LINKEDIN_REST_BASE_URL ?? "https://api.linkedin.com/rest";
const DEFAULT_LINKEDIN_API_VERSION = "202602";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinkedInProfile {
  /** LinkedIn member URN — stable unique identifier (the `sub` from OIDC). */
  linkedInId: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  pictureUrl: string | null;
  headline: string | null;
  /** Direct URL to the member's LinkedIn profile page. */
  profileUrl: string | null;
}

// ---------------------------------------------------------------------------
// Tier 1: extract from Supabase user metadata (no API call)
// ---------------------------------------------------------------------------

/**
 * Build a best-effort LinkedInProfile from the user_metadata object that
 * Supabase populates after a LinkedIn OIDC sign-in.
 *
 * Key fields Supabase reliably sets from LinkedIn OIDC:
 *   full_name / name — display name
 *   picture          — CDN profile photo URL
 *   email            — primary email (also on user.email)
 *   iss              — "https://www.linkedin.com" (confirms provider)
 *   sub              — LinkedIn member URN
 *   provider_id      — same as sub
 */
export function extractProfileFromOidcMetadata(
  userMeta: Record<string, unknown>
): LinkedInProfile {
  const sub =
    (userMeta.sub as string | undefined) ??
    (userMeta.provider_id as string | undefined) ??
    null;

  const fullName =
    (userMeta.full_name as string | undefined) ??
    (userMeta.name as string | undefined) ??
    null;

  const picture =
    (userMeta.avatar_url as string | undefined) ??
    (userMeta.picture as string | undefined) ??
    null;

  const email =
    (userMeta.email as string | undefined) ?? null;

  // Supabase LinkedIn OIDC sometimes splits given/family name
  const firstName = (userMeta.given_name as string | undefined) ?? null;
  const lastName = (userMeta.family_name as string | undefined) ?? null;

  const profileUrl = sub
    ? `https://www.linkedin.com/in/${sub}`
    : null;

  return {
    linkedInId: sub,
    fullName,
    firstName,
    lastName,
    email,
    pictureUrl: picture && isAllowedLinkedInImageHost(picture) ? picture : null,
    headline: null,
    profileUrl,
  };
}

// ---------------------------------------------------------------------------
// Tier 2: LinkedIn /userinfo endpoint (OIDC standard)
// ---------------------------------------------------------------------------

/**
 * Fetch the user's profile via LinkedIn's OIDC /userinfo endpoint.
 * Requires the OAuth2 access token from the LinkedIn OIDC sign-in session.
 *
 * On the client side this token is available as session.provider_token.
 * On the server side it must be passed in explicitly.
 */
export async function fetchLinkedInUserInfo(
  providerToken: string
): Promise<LinkedInProfile> {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${providerToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `LinkedIn /userinfo returned HTTP ${response.status}.`
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  const sub = (data.sub as string | undefined) ?? null;
  const fullName = (data.name as string | undefined) ?? null;
  const firstName = (data.given_name as string | undefined) ?? null;
  const lastName = (data.family_name as string | undefined) ?? null;
  const email = (data.email as string | undefined) ?? null;
  const picture = (data.picture as string | undefined) ?? null;

  return {
    linkedInId: sub,
    fullName,
    firstName,
    lastName,
    email,
    pictureUrl: picture && isAllowedLinkedInImageHost(picture) ? picture : null,
    headline: null,
    profileUrl: sub ? `https://www.linkedin.com/in/${sub}` : null,
  };
}

// ---------------------------------------------------------------------------
// Tier 3: LinkedIn REST /me endpoint
// ---------------------------------------------------------------------------

/**
 * Fetch the member's basic profile from the LinkedIn REST API.
 * Any valid LinkedIn OAuth2 access token works here, including the
 * company-admin token, as long as `r_liteprofile` (or `profile`) scope
 * was granted.
 *
 * Returns null fields for data not available under the granted scopes
 * rather than throwing — callers should treat this as supplementary.
 */
export async function fetchLinkedInMeProfile(
  accessToken: string
): Promise<Partial<LinkedInProfile>> {
  const version =
    process.env.LINKEDIN_API_VERSION?.trim().match(/^\d{6}$/)
      ? process.env.LINKEDIN_API_VERSION.trim()
      : DEFAULT_LINKEDIN_API_VERSION;

  const response = await fetch(`${LINKEDIN_REST_BASE_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": version,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    // Non-fatal — caller falls back to OIDC metadata
    return {};
  }

  const data = (await response.json()) as Record<string, unknown>;

  const id = (data.id as string | undefined) ?? null;

  const firstName = extractLocalizedString(data.firstName) ?? null;
  const lastName = extractLocalizedString(data.lastName) ?? null;
  const fullName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName ?? lastName ?? null;

  const pictureUrl = extractProfilePictureUrl(data.profilePicture) ?? null;

  return {
    linkedInId: id,
    fullName,
    firstName,
    lastName,
    pictureUrl,
    // headline requires r_fullprofile (partner access) — not included
    headline: null,
  };
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

/**
 * Merge OIDC metadata profile with a REST /me profile.
 * REST data takes precedence for fields it provides (more authoritative).
 * OIDC data fills gaps.
 */
export function mergeLinkedInProfiles(
  base: LinkedInProfile,
  supplement: Partial<LinkedInProfile>
): LinkedInProfile {
  return {
    linkedInId: supplement.linkedInId ?? base.linkedInId,
    fullName: supplement.fullName ?? base.fullName,
    firstName: supplement.firstName ?? base.firstName,
    lastName: supplement.lastName ?? base.lastName,
    email: base.email, // email only from OIDC — /me doesn't return it
    pictureUrl: supplement.pictureUrl ?? base.pictureUrl,
    headline: supplement.headline ?? base.headline,
    profileUrl: base.profileUrl,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAllowedLinkedInImageHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "media.licdn.com" ||
      hostname.endsWith(".licdn.com") ||
      hostname === "lh3.googleusercontent.com" ||
      hostname.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

function extractLocalizedString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (!value || typeof value !== "object") return undefined;
  const obj = value as {
    localized?: Record<string, string>;
    preferredLocale?: { language?: string; country?: string };
  };
  const localized = obj.localized;
  if (!localized) return undefined;
  const preferred = obj.preferredLocale;
  if (preferred?.language && preferred?.country) {
    const key = `${preferred.language}_${preferred.country}`;
    if (typeof localized[key] === "string" && localized[key].trim().length > 0) {
      return localized[key].trim();
    }
  }
  const first = Object.values(localized).find(
    (v) => typeof v === "string" && v.trim().length > 0
  );
  return typeof first === "string" ? first.trim() : undefined;
}

function extractProfilePictureUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;

  // LinkedIn REST v2 profilePicture.displayImage~.elements[].identifiers
  const displayImage = obj["displayImage~"] as Record<string, unknown> | undefined;
  if (displayImage?.elements && Array.isArray(displayImage.elements)) {
    const largest = displayImage.elements
      .filter((el): el is Record<string, unknown> => typeof el === "object" && el !== null)
      .filter((el) => {
        const ids = el.identifiers;
        return Array.isArray(ids) && ids.length > 0;
      })
      .pop(); // last element is usually largest

    if (largest) {
      const ids = largest.identifiers as Array<{ identifier?: string }>;
      const url = ids[0]?.identifier;
      if (url && isAllowedLinkedInImageHost(url)) return url;
    }
  }

  // Fallback: some versions put it at profilePicture.cropped or .original
  if (typeof obj.cropped === "string" && isAllowedLinkedInImageHost(obj.cropped)) {
    return obj.cropped;
  }
  if (typeof obj.original === "string" && isAllowedLinkedInImageHost(obj.original)) {
    return obj.original;
  }

  return undefined;
}
