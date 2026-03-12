import { createHash, randomBytes } from "node:crypto";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import { callMcpTool, connectMcpServer } from "@/lib/mcp/client";
import type { McpServerConfig, McpTool } from "@/lib/mcp/types";
import { parseJsonRecord } from "./server";

type HubSpotEntity = "deals" | "companies" | "contacts";

export interface HubSpotTokenSet {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: string;
}

export interface HubSpotHistoryPreview {
  entity: HubSpotEntity;
  toolName: string;
  preview: string;
}

export interface HubSpotSelectiveSyncResult {
  tools: McpTool[];
  userDetails: string | null;
  previews: HubSpotHistoryPreview[];
  warnings: string[];
}

const DEFAULT_HUBSPOT_SERVER_URL = "https://mcp.hubspot.com";
const DEFAULT_AUTHORIZE_URL = "https://mcp.hubspot.com/oauth/authorize/user";
const DEFAULT_TOKEN_URL = "https://mcp.hubspot.com/oauth/v3/token";

const ENTITY_FIELD_PREFERENCES: Record<HubSpotEntity, string[]> = {
  deals: ["dealname", "pipeline", "dealstage", "amount", "closedate"],
  companies: ["name", "domain", "industry", "city", "country"],
  contacts: ["firstname", "lastname", "email", "jobtitle", "company"],
};

function getHubSpotClientCredentials() {
  const clientId = getHubSpotClientId();
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

  if (!clientSecret) {
    throw new Error("Missing HUBSPOT_CLIENT_SECRET.");
  }

  return { clientId, clientSecret };
}

function getHubSpotClientId() {
  const clientId = process.env.HUBSPOT_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing HUBSPOT_CLIENT_ID.");
  }

  return clientId;
}

export function assertHubSpotOAuthConfiguration() {
  return getHubSpotClientCredentials();
}

function base64UrlEncode(value: Buffer) {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function stripToolText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function summariseText(value: string, maxLength = 420) {
  const cleaned = stripToolText(value);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

function getToolText(result: { content: Array<{ type: string; text?: string }> }) {
  return result.content
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text ?? "")
    .join("\n\n");
}

function getToolScore(tool: McpTool, entity: HubSpotEntity) {
  const haystack = `${tool.name} ${tool.description ?? ""}`.toLowerCase();
  let score = 0;

  if (entity === "deals" && haystack.includes("deal")) score += 6;
  if (entity === "companies" && haystack.includes("compan")) score += 6;
  if (entity === "contacts" && haystack.includes("contact")) score += 6;
  if (haystack.includes("search")) score += 4;
  if (haystack.includes("list")) score += 3;
  if (haystack.includes("query")) score += 3;
  if (haystack.includes("recent")) score += 2;
  if (haystack.includes("crm")) score += 1;

  return score;
}

function getSchemaDetails(tool: McpTool) {
  const schema = tool.inputSchema;
  if (!schema || typeof schema !== "object") {
    return { properties: {}, required: [] as string[] };
  }

  const candidate = schema as {
    properties?: Record<string, { type?: string; enum?: string[]; default?: unknown }>;
    required?: string[];
  };

  return {
    properties: candidate.properties ?? {},
    required: Array.isArray(candidate.required) ? candidate.required : [],
  };
}

function buildEntityToolArgs(tool: McpTool, entity: HubSpotEntity, limit: number) {
  const { properties, required } = getSchemaDetails(tool);
  const args: Record<string, unknown> = {};
  const singular = entity === "companies" ? "company" : entity === "contacts" ? "contact" : "deal";

  for (const [key, property] of Object.entries(properties)) {
    const lowerKey = key.toLowerCase();
    const enumValues = Array.isArray(property.enum) ? property.enum.map((value) => value.toLowerCase()) : [];

    if (
      enumValues.includes(entity) ||
      enumValues.includes(singular) ||
      enumValues.includes(`${singular}s`)
    ) {
      args[key] = property.enum?.find((value) => {
        const lowerValue = value.toLowerCase();
        return lowerValue === entity || lowerValue === singular || lowerValue === `${singular}s`;
      });
      continue;
    }

    if (/(^|_)(limit|max|count|page_size|pagesize)(_|$)/i.test(lowerKey)) {
      args[key] = limit;
      continue;
    }

    if (/(object|entity|resource|record)_?type/i.test(lowerKey)) {
      args[key] = singular;
      continue;
    }

    if (/(properties|fields|field_names)/i.test(lowerKey)) {
      args[key] = ENTITY_FIELD_PREFERENCES[entity];
      continue;
    }

    if (/(include_)?archived/i.test(lowerKey)) {
      args[key] = false;
      continue;
    }

    if (required.includes(key) && /(query|search|term|text|q)$/i.test(lowerKey)) {
      args[key] = singular;
      continue;
    }

    if (required.includes(key) && property.default !== undefined) {
      args[key] = property.default;
    }
  }

  const unsupportedRequired = required.filter((key) => args[key] === undefined);
  if (unsupportedRequired.length > 0) {
    return null;
  }

  return args;
}

function buildHubSpotMcpConfig(accessToken: string): McpServerConfig {
  return {
    id: CONNECTOR_IDS.hubspot,
    name: "HubSpot CRM History",
    url: process.env.HUBSPOT_MCP_SERVER_URL ?? DEFAULT_HUBSPOT_SERVER_URL,
    transport: "streamable-http",
    auth: {
      type: "bearer",
      token: accessToken,
    },
  };
}

export function createHubSpotPkcePair() {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function buildHubSpotAuthorizeUrl(options: {
  redirectUri: string;
  state: string;
  challenge: string;
}) {
  const clientId = getHubSpotClientId();
  const url = new URL(DEFAULT_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("state", options.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", options.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeHubSpotAuthorizationCode(options: {
  code: string;
  verifier: string;
  redirectUri: string;
}) {
  const { clientId, clientSecret } = getHubSpotClientCredentials();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: options.code,
    redirect_uri: options.redirectUri,
    code_verifier: options.verifier,
  });

  const response = await fetch(DEFAULT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as HubSpotTokenSet | { message?: string } | null;
  if (!response.ok || !data || typeof data !== "object" || !("access_token" in data)) {
    throw new Error(
      (data && "message" in data && typeof data.message === "string" && data.message) ||
        `HubSpot token exchange failed with status ${response.status}.`
    );
  }

  return {
    ...data,
    expires_at:
      typeof data.expires_in === "number"
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
  };
}

export async function refreshHubSpotAuthorization(refreshToken: string) {
  const { clientId, clientSecret } = getHubSpotClientCredentials();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(DEFAULT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as HubSpotTokenSet | { message?: string } | null;
  if (!response.ok || !data || typeof data !== "object" || !("access_token" in data)) {
    throw new Error(
      (data && "message" in data && typeof data.message === "string" && data.message) ||
        `HubSpot token refresh failed with status ${response.status}.`
    );
  }

  return {
    ...data,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at:
      typeof data.expires_in === "number"
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
  };
}

export function getHubSpotTokensFromConfig(config: unknown): HubSpotTokenSet | null {
  const record = parseJsonRecord(config);
  const auth = parseJsonRecord(record.auth);

  if (typeof auth.access_token !== "string" || auth.access_token.length === 0) {
    return null;
  }

  return {
    access_token: auth.access_token,
    refresh_token:
      typeof auth.refresh_token === "string" && auth.refresh_token.length > 0
        ? auth.refresh_token
        : undefined,
    token_type:
      typeof auth.token_type === "string" && auth.token_type.length > 0 ? auth.token_type : undefined,
    expires_in: typeof auth.expires_in === "number" ? auth.expires_in : undefined,
    expires_at:
      typeof auth.expires_at === "string" && auth.expires_at.length > 0 ? auth.expires_at : undefined,
  };
}

export function isHubSpotTokenExpired(tokens: HubSpotTokenSet) {
  if (!tokens.expires_at) {
    return false;
  }

  return new Date(tokens.expires_at).getTime() <= Date.now() + 60_000;
}

export async function runHubSpotSelectiveSync(
  accessToken: string,
  limits = { deals: 6, companies: 6, contacts: 6 }
): Promise<HubSpotSelectiveSyncResult> {
  const config = buildHubSpotMcpConfig(accessToken);
  const connection = await connectMcpServer(config);
  const tools = connection.tools;
  const warnings: string[] = [];
  const previews: HubSpotHistoryPreview[] = [];

  let userDetails: string | null = null;
  if (tools.some((tool) => tool.name === "get_user_details")) {
    try {
      const userResult = await callMcpTool(config, "get_user_details", {});
      const text = summariseText(getToolText(userResult));
      userDetails = text || null;
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Could not read HubSpot user details: ${error.message}`
          : "Could not read HubSpot user details."
      );
    }
  }

  for (const entity of ["deals", "companies", "contacts"] as const) {
    const candidate = [...tools]
      .map((tool) => ({ tool, score: getToolScore(tool, entity) }))
      .filter(({ score }) => score >= 6)
      .sort((left, right) => right.score - left.score)[0]?.tool;

    if (!candidate) {
      warnings.push(`No ${entity} tool was exposed by the authenticated HubSpot MCP server.`);
      continue;
    }

    const args = buildEntityToolArgs(candidate, entity, limits[entity]);
    if (args === null) {
      warnings.push(
        `Skipped ${entity} preview because ${candidate.name} requires arguments BidBlender does not know how to provide safely.`
      );
      continue;
    }

    try {
      const result = await callMcpTool(config, candidate.name, args);
      const preview = summariseText(getToolText(result));

      if (!preview) {
        warnings.push(`HubSpot ${entity} preview returned no readable text.`);
        continue;
      }

      previews.push({
        entity,
        toolName: candidate.name,
        preview,
      });
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `HubSpot ${entity} preview failed via ${candidate.name}: ${error.message}`
          : `HubSpot ${entity} preview failed via ${candidate.name}.`
      );
    }
  }

  return { tools, userDetails, previews, warnings };
}
