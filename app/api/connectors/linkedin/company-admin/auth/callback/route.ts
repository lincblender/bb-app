import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import {
  buildLinkedInCompanyAdminConnectorConfig,
  exchangeLinkedInCompanyAdminAuthorizationCode,
  getLinkedInClientCredentialsFromConfig,
  isLinkedInCompanyAdminPkceEnabled,
  resolveLinkedInClientCredentials,
  runLinkedInCompanyAdminSync,
} from "@/lib/connectors/linkedin-company-admin";
import {
  createIntelligenceEvent,
  getAuthenticatedTenantContext,
  parseJsonRecord,
  upsertConnectorSource,
} from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

const LINKEDIN_ADMIN_STATE_COOKIE = "bidblender_linkedin_admin_state";
const LINKEDIN_ADMIN_VERIFIER_COOKIE = "bidblender_linkedin_admin_verifier";
const LINKEDIN_ADMIN_NEXT_COOKIE = "bidblender_linkedin_admin_next";

function buildRedirect(requestUrl: string, next: string, status: "connected" | "error", detail: string) {
  const destination = new URL(next, requestUrl);
  destination.searchParams.set("linkedin_admin", status);
  destination.searchParams.set("detail", detail);
  return destination;
}

export async function GET(request: Request) {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.redirect(new URL("/auth/signin?error=auth_required", request.url));
  }

  const url = new URL(request.url);
  const cookieStore = await cookies();
  const next = cookieStore.get(LINKEDIN_ADMIN_NEXT_COOKIE)?.value || "/connectors";
  const expectedState = cookieStore.get(LINKEDIN_ADMIN_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(LINKEDIN_ADMIN_VERIFIER_COOKIE)?.value;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const oauthErrorDescription = url.searchParams.get("error_description");

  cookieStore.delete(LINKEDIN_ADMIN_STATE_COOKIE);
  cookieStore.delete(LINKEDIN_ADMIN_VERIFIER_COOKIE);
  cookieStore.delete(LINKEDIN_ADMIN_NEXT_COOKIE);

  if (oauthError) {
    return NextResponse.redirect(
      buildRedirect(
        request.url,
        next,
        "error",
        oauthErrorDescription || oauthError || "LinkedIn company-page authorisation was cancelled."
      )
    );
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      buildRedirect(
        request.url,
        next,
        "error",
        "LinkedIn company-page authorisation could not be verified."
      )
    );
  }

  if (isLinkedInCompanyAdminPkceEnabled() && !verifier) {
    return NextResponse.redirect(
      buildRedirect(
        request.url,
        next,
        "error",
        "LinkedIn company-page authorisation is missing the PKCE verifier."
      )
    );
  }

  const { supabase, tenantId } = context;

  const { data: existingConnector, error: existingConnectorError } = await supabase
    .from("connector_sources")
    .select("config")
    .eq("tenant_id", tenantId)
    .eq("id", CONNECTOR_IDS.linkedinCompanyAdmin)
    .maybeSingle();

  if (existingConnectorError) {
    return NextResponse.redirect(
      buildRedirect(request.url, next, "error", "Could not load connector configuration.")
    );
  }

  const existingConfig = parseJsonRecord(existingConnector?.config);
  const credentialsFromConfig = getLinkedInClientCredentialsFromConfig(existingConfig);
  let credentials;
  try {
    credentials = resolveLinkedInClientCredentials(credentialsFromConfig);
  } catch {
    return NextResponse.redirect(
      buildRedirect(
        request.url,
        next,
        "error",
        "LinkedIn app credentials are missing. Please add your Client ID and Secret in the connector setup."
      )
    );
  }

  try {
    const redirectUri = `${url.origin}/api/connectors/linkedin/company-admin/auth/callback`;
    const tokens = await exchangeLinkedInCompanyAdminAuthorizationCode(
      {
        code,
        redirectUri,
        verifier,
      },
      credentials
    );
    const syncResult = await runLinkedInCompanyAdminSync(tokens.access_token);
    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_IDS.linkedinCompanyAdmin,
      status: "live",
      sourceType: "network",
      config: buildLinkedInCompanyAdminConnectorConfig(existingConfig, tokens, syncResult),
    });

    await createIntelligenceEvent(supabase, tenantId, {
      type: "connector_synced",
      description:
        syncResult.organizations.length > 0
          ? `LinkedIn company-page access connected for ${syncResult.organizations.length} administered organizations.`
          : "LinkedIn company-page access connected, but no approved organization roles were found.",
    }).catch(() => undefined);

    return NextResponse.redirect(
      buildRedirect(
        request.url,
        next,
        "connected",
        syncResult.organizations.length > 0
          ? `LinkedIn company-page access is ready for ${syncResult.organizations.length} organizations.`
          : "LinkedIn company-page auth completed, but no approved organization roles were found for this member."
      )
    );
  } catch (error) {
    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_IDS.linkedinCompanyAdmin,
      status: "manual",
      sourceType: "network",
      config: {
        last_error:
          error instanceof Error
            ? error.message
            : "LinkedIn company-page authorisation failed for an unknown reason.",
        last_failed_at: new Date().toISOString(),
      },
    }).catch(() => undefined);

    return NextResponse.redirect(
      buildRedirect(
        request.url,
        next,
        "error",
        error instanceof Error ? error.message : "LinkedIn company-page authorisation failed."
      )
    );
  }
}
