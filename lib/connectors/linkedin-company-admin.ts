import { createHash, randomBytes } from "node:crypto";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import { parseJsonRecord } from "./server";

export interface LinkedInCompanyAdminTokenSet {
  access_token: string;
  expires_in?: number;
  expires_at?: string;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

export interface LinkedInCompanyRoleAssignment {
  role: string;
  state: string;
  organizationUrn: string;
  organizationId: string;
}

export interface LinkedInManagedOrganization {
  id: string;
  urn: string;
  name: string;
  localizedName?: string;
  vanityName?: string;
  website?: string;
  primaryOrganizationType?: string;
  staffCountRange?: string;
  industries: string[];
  locations: string[];
  roles: string[];
  roleStates: string[];
  authorityLevel: string;
  logoAsset?: string;
}

export interface LinkedInCompanyAdminSyncResult {
  roleAssignments: LinkedInCompanyRoleAssignment[];
  organizations: LinkedInManagedOrganization[];
  warnings: string[];
}

type JsonRecord = Record<string, unknown>;

interface LinkedInOrganizationLookupRecord {
  id: string;
  name: string;
  localizedName?: string;
  vanityName?: string;
  website?: string;
  primaryOrganizationType?: string;
  staffCountRange?: string;
  industries: string[];
  locations: string[];
  logoAsset?: string;
}

const LINKEDIN_AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_REST_BASE_URL = process.env.LINKEDIN_REST_BASE_URL ?? "https://api.linkedin.com/rest";
const DEFAULT_LINKEDIN_API_VERSION = "202602";
const DEFAULT_LINKEDIN_COMPANY_ADMIN_SCOPES = "r_organization_admin";
const PKCE_TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export interface LinkedInClientCredentials {
  clientId: string;
  clientSecret: string;
}

export function getLinkedInClientCredentialsFromConfig(config: Record<string, unknown>): LinkedInClientCredentials | null {
  const clientId = typeof config.linkedin_client_id === "string" ? config.linkedin_client_id.trim() : undefined;
  const clientSecret = typeof config.linkedin_client_secret === "string" ? config.linkedin_client_secret.trim() : undefined;
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

export function resolveLinkedInClientCredentials(override?: LinkedInClientCredentials | null): LinkedInClientCredentials {
  const clientId = override?.clientId ?? process.env.LINKEDIN_CLIENT_ID?.trim();
  const clientSecret = override?.clientSecret ?? process.env.LINKEDIN_CLIENT_SECRET?.trim();

  if (!clientId) {
    throw new Error("Missing LINKEDIN_CLIENT_ID.");
  }

  if (!clientSecret) {
    throw new Error("Missing LINKEDIN_CLIENT_SECRET.");
  }

  return { clientId, clientSecret };
}

function base64UrlEncode(value: Buffer) {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function extractOrganizationId(value: string) {
  const match = value.match(/organization:(\d+)$/);
  return match?.[1] ?? value;
}

function getLocalizedString(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as {
    localized?: Record<string, string>;
    preferredLocale?: { language?: string; country?: string };
  };

  const localized = record.localized;
  if (!localized || typeof localized !== "object") {
    return undefined;
  }

  const preferredLocale = record.preferredLocale;
  if (preferredLocale?.language && preferredLocale?.country) {
    const exact = localized[`${preferredLocale.language}_${preferredLocale.country}`];
    if (typeof exact === "string" && exact.trim().length > 0) {
      return exact.trim();
    }
  }

  const first = Object.values(localized).find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0
  );

  return typeof first === "string" ? first.trim() : undefined;
}

function getLocationLabels(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }

      if (!entry || typeof entry !== "object") {
        return "";
      }

      const record = entry as Record<string, unknown>;
      const directLabel = readString(record.localizedName) ?? getLocalizedString(record.location);
      if (directLabel) {
        return directLabel;
      }

      const country = readString(record.country);
      const region = readString(record.geographicArea);
      return [region, country].filter(Boolean).join(", ");
    })
    .filter((label) => label.length > 0);
}

function getLogoAsset(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return readString(record.cropped) ?? readString(record.original);
}

function getAuthorityLevel(roles: string[]) {
  const orderedRoles = [
    "ADMINISTRATOR",
    "CONTENT_ADMINISTRATOR",
    "ANALYST",
    "CURATOR",
    "DIRECT_SPONSORED_CONTENT_POSTER",
    "RECRUITING_POSTER",
    "LEAD_CAPTURE_ADMINISTRATOR",
    "LEAD_GEN_FORMS_MANAGER",
  ];

  const matchedRole = orderedRoles.find((role) => roles.includes(role));
  return matchedRole ?? roles[0] ?? "UNKNOWN";
}

function parseLinkedInErrorMessage(status: number, data: unknown) {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const topLevelMessage = readString(record.message);
    if (topLevelMessage) {
      return topLevelMessage;
    }

    const errorDescription = readString(record.error_description);
    if (errorDescription) {
      return errorDescription;
    }

    const serviceError = readString(record.error);
    if (serviceError) {
      return serviceError;
    }
  }

  return `LinkedIn request failed with status ${status}.`;
}

function getLinkedInApiVersion() {
  const version = process.env.LINKEDIN_API_VERSION?.trim();
  return version && /^\d{6}$/.test(version) ? version : DEFAULT_LINKEDIN_API_VERSION;
}

function getLinkedInCompanyAdminScopes() {
  const raw = process.env.LINKEDIN_COMPANY_ADMIN_SCOPES?.trim() || DEFAULT_LINKEDIN_COMPANY_ADMIN_SCOPES;
  return raw.split(/\s+/).filter(Boolean);
}

export function isLinkedInCompanyAdminPkceEnabled() {
  const raw = process.env.LINKEDIN_COMPANY_ADMIN_USE_PKCE?.trim().toLowerCase();
  return raw ? PKCE_TRUE_VALUES.has(raw) : false;
}

export function assertLinkedInCompanyAdminConfiguration(override?: LinkedInClientCredentials | null) {
  return resolveLinkedInClientCredentials(override);
}

export function createLinkedInCompanyAdminPkcePair() {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function buildLinkedInCompanyAdminAuthorizeUrl(
  options: {
    redirectUri: string;
    state: string;
    challenge?: string;
  },
  credentialsOverride?: LinkedInClientCredentials | null
) {
  const { clientId } = resolveLinkedInClientCredentials(credentialsOverride);
  const url = new URL(LINKEDIN_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("state", options.state);
  url.searchParams.set("scope", getLinkedInCompanyAdminScopes().join(" "));

  if (options.challenge) {
    url.searchParams.set("code_challenge", options.challenge);
    url.searchParams.set("code_challenge_method", "S256");
  }

  return url.toString();
}

export async function exchangeLinkedInCompanyAdminAuthorizationCode(
  options: {
    code: string;
    redirectUri: string;
    verifier?: string;
  },
  credentialsOverride?: LinkedInClientCredentials | null
) {
  const { clientId, clientSecret } = resolveLinkedInClientCredentials(credentialsOverride);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: options.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: options.redirectUri,
  });

  if (options.verifier) {
    body.set("code_verifier", options.verifier);
  }

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as LinkedInCompanyAdminTokenSet | null;
  if (!response.ok || !data || typeof data.access_token !== "string" || data.access_token.length === 0) {
    throw new Error(parseLinkedInErrorMessage(response.status, data));
  }

  return {
    ...data,
    expires_at:
      typeof data.expires_in === "number"
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
  } satisfies LinkedInCompanyAdminTokenSet;
}

async function fetchLinkedInJson<T>(path: string, accessToken: string) {
  const response = await fetch(new URL(path, `${LINKEDIN_REST_BASE_URL}/`), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": getLinkedInApiVersion(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !data) {
    throw new Error(parseLinkedInErrorMessage(response.status, data));
  }

  return data;
}

async function fetchLinkedInRoleAssignments(accessToken: string) {
  const assignments: LinkedInCompanyRoleAssignment[] = [];
  const warnings: string[] = [];
  const count = 100;
  let start = 0;

  while (true) {
    const path = `organizationAcls?q=roleAssignee&state=APPROVED&count=${count}&start=${start}`;
    const data = await fetchLinkedInJson<{
      elements?: Array<Record<string, unknown>>;
      paging?: { count?: number; start?: number };
    }>(path, accessToken);

    const elements = Array.isArray(data.elements) ? data.elements : [];
    assignments.push(
      ...elements
        .map((entry) => {
          const organizationUrn =
            readString(entry.organizationTarget) ?? readString(entry.organization) ?? "";
          const role = readString(entry.role) ?? "";
          const state = readString(entry.state) ?? "APPROVED";
          const organizationId = organizationUrn ? extractOrganizationId(organizationUrn) : "";

          if (!organizationUrn || !organizationId || !role) {
            return null;
          }

          return {
            role,
            state,
            organizationUrn,
            organizationId,
          } satisfies LinkedInCompanyRoleAssignment;
        })
        .filter((entry): entry is LinkedInCompanyRoleAssignment => entry !== null)
    );

    if (elements.length < count) {
      break;
    }

    start += count;
  }

  if (assignments.length === 0) {
    warnings.push("No approved LinkedIn organisation roles were found for this member.");
  }

  return {
    roleAssignments: assignments,
    warnings,
  };
}

async function fetchLinkedInOrganizations(
  accessToken: string,
  organizationIds: string[]
): Promise<{ organizations: LinkedInOrganizationLookupRecord[]; warnings: string[] }> {
  const warnings: string[] = [];
  if (organizationIds.length === 0) {
    return { organizations: [], warnings };
  }

  const path = `organizations?ids=List(${organizationIds.join(",")})`;
  const data = await fetchLinkedInJson<{
    results?: Record<string, Record<string, unknown>>;
    statuses?: Record<string, number>;
    errors?: Record<string, { message?: string }>;
  }>(path, accessToken);

  const results = data.results ?? {};
  const statuses = data.statuses ?? {};
  const errors = data.errors ?? {};

  const organizations: LinkedInOrganizationLookupRecord[] = [];

  for (const organizationId of organizationIds) {
    const record = results[organizationId];
    if (!record || (statuses[organizationId] && statuses[organizationId] !== 200)) {
      const errorMessage = readString(errors[organizationId]?.message);
      if (errorMessage) {
        warnings.push(`LinkedIn organization ${organizationId}: ${errorMessage}`);
      }
      continue;
    }

    organizations.push({
      id: String(record.id ?? organizationId),
      name: readString(record.localizedName) ?? getLocalizedString(record.name) ?? `Organization ${organizationId}`,
      localizedName: readString(record.localizedName),
      vanityName: readString(record.vanityName),
      website: readString(record.localizedWebsite),
      primaryOrganizationType: readString(record.primaryOrganizationType),
      staffCountRange: readString(record.staffCountRange),
      industries: readStringArray(record.industries),
      locations: getLocationLabels(record.locations),
      logoAsset: getLogoAsset(record.logoV2),
    });
  }

  return { organizations, warnings: dedupe(warnings) };
}

export async function runLinkedInCompanyAdminSync(accessToken: string): Promise<LinkedInCompanyAdminSyncResult> {
  const roleResult = await fetchLinkedInRoleAssignments(accessToken);
  const groupedAssignments = new Map<
    string,
    {
      urn: string;
      roles: Set<string>;
      roleStates: Set<string>;
    }
  >();

  for (const assignment of roleResult.roleAssignments) {
    const existing = groupedAssignments.get(assignment.organizationId) ?? {
      urn: assignment.organizationUrn,
      roles: new Set<string>(),
      roleStates: new Set<string>(),
    };
    existing.roles.add(assignment.role);
    existing.roleStates.add(assignment.state);
    groupedAssignments.set(assignment.organizationId, existing);
  }

  const lookupResult = await fetchLinkedInOrganizations(
    accessToken,
    Array.from(groupedAssignments.keys())
  ).catch((error) => ({
    organizations: [] as LinkedInOrganizationLookupRecord[],
    warnings: [error instanceof Error ? error.message : "LinkedIn organization lookup failed."],
  }));

  const organizationsById = new Map(
    lookupResult.organizations.map((organization) => [organization.id, organization])
  );

  const organizations = Array.from(groupedAssignments.entries())
    .map(([organizationId, summary]) => {
      const lookup = organizationsById.get(organizationId);
      const roles = Array.from(summary.roles).sort();
      const roleStates = Array.from(summary.roleStates).sort();

      return {
        id: organizationId,
        urn: summary.urn,
        name: lookup?.name ?? `Organization ${organizationId}`,
        localizedName: lookup?.localizedName,
        vanityName: lookup?.vanityName,
        website: lookup?.website,
        primaryOrganizationType: lookup?.primaryOrganizationType,
        staffCountRange: lookup?.staffCountRange,
        industries: lookup?.industries ?? [],
        locations: lookup?.locations ?? [],
        roles,
        roleStates,
        authorityLevel: getAuthorityLevel(roles),
        logoAsset: lookup?.logoAsset,
      } satisfies LinkedInManagedOrganization;
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    roleAssignments: roleResult.roleAssignments,
    organizations,
    warnings: dedupe([...roleResult.warnings, ...lookupResult.warnings]),
  };
}

export function getLinkedInCompanyAdminTokensFromConfig(config: JsonRecord) {
  const auth = parseJsonRecord(config.auth);
  if (typeof auth.access_token !== "string" || auth.access_token.length === 0) {
    return null;
  }

  return {
    access_token: auth.access_token,
    refresh_token:
      typeof auth.refresh_token === "string" && auth.refresh_token.length > 0
        ? auth.refresh_token
        : undefined,
    refresh_token_expires_in:
      typeof auth.refresh_token_expires_in === "number" ? auth.refresh_token_expires_in : undefined,
    expires_in: typeof auth.expires_in === "number" ? auth.expires_in : undefined,
    expires_at: typeof auth.expires_at === "string" && auth.expires_at.length > 0 ? auth.expires_at : undefined,
    scope: typeof auth.scope === "string" && auth.scope.length > 0 ? auth.scope : undefined,
  } satisfies LinkedInCompanyAdminTokenSet;
}

export function isLinkedInCompanyAdminTokenExpired(tokens: LinkedInCompanyAdminTokenSet) {
  if (!tokens.expires_at) {
    return false;
  }

  const expiresAt = new Date(tokens.expires_at).getTime();
  if (Number.isNaN(expiresAt)) {
    return false;
  }

  return expiresAt <= Date.now() + 60_000;
}

export function buildLinkedInCompanyAdminConnectorConfig(
  existingConfig: JsonRecord,
  tokens: LinkedInCompanyAdminTokenSet,
  syncResult: LinkedInCompanyAdminSyncResult
) {
  return {
    ...existingConfig,
    setup: isLinkedInCompanyAdminPkceEnabled() ? "oauth-pkce" : "oauth",
    provider: "linkedin_oauth",
    connector_id: CONNECTOR_IDS.linkedinCompanyAdmin,
    requested_scopes: getLinkedInCompanyAdminScopes(),
    api_version: getLinkedInApiVersion(),
    auth: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      refresh_token_expires_in: tokens.refresh_token_expires_in ?? null,
      expires_in: tokens.expires_in ?? null,
      expires_at: tokens.expires_at ?? null,
      scope: tokens.scope ?? null,
    },
    authorized_at: existingConfig.authorized_at ?? new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    managed_organization_count: syncResult.organizations.length,
    managed_organizations: syncResult.organizations,
    approved_role_count: syncResult.roleAssignments.length,
    role_assignments: syncResult.roleAssignments,
    last_sync_error: null,
    sync_warnings: syncResult.warnings,
  };
}
