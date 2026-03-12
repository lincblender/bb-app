import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import {
  exchangeHubSpotAuthorizationCode,
  runHubSpotSelectiveSync,
} from "@/lib/connectors/hubspot";
import {
  createIntelligenceEvent,
  getAuthenticatedTenantContext,
  parseJsonRecord,
  upsertConnectorSource,
} from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

const HUBSPOT_STATE_COOKIE = "bidblender_hubspot_state";
const HUBSPOT_VERIFIER_COOKIE = "bidblender_hubspot_verifier";
const HUBSPOT_NEXT_COOKIE = "bidblender_hubspot_next";

function buildRedirect(requestUrl: string, next: string, status: "connected" | "error", detail: string) {
  const destination = new URL(next, requestUrl);
  destination.searchParams.set("hubspot", status);
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
  const next = cookieStore.get(HUBSPOT_NEXT_COOKIE)?.value || "/console/connectors";
  const expectedState = cookieStore.get(HUBSPOT_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(HUBSPOT_VERIFIER_COOKIE)?.value;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  cookieStore.delete(HUBSPOT_STATE_COOKIE);
  cookieStore.delete(HUBSPOT_VERIFIER_COOKIE);
  cookieStore.delete(HUBSPOT_NEXT_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return NextResponse.redirect(
      buildRedirect(request.url, next, "error", "HubSpot authorisation could not be verified.")
    );
  }

  const { supabase, tenantId } = context;

  try {
    const redirectUri = `${url.origin}/api/connectors/hubspot/auth/callback`;
    const tokens = await exchangeHubSpotAuthorizationCode({
      code,
      verifier,
      redirectUri,
    });

    const { data: existingConnector, error: existingConnectorError } = await supabase
      .from("connector_sources")
      .select("config")
      .eq("tenant_id", tenantId)
      .eq("id", CONNECTOR_IDS.hubspot)
      .maybeSingle();

    if (existingConnectorError) {
      throw existingConnectorError;
    }

    const existingConfig = parseJsonRecord(existingConnector?.config);
    const selectiveSync = await runHubSpotSelectiveSync(tokens.access_token).catch((error) => ({
      tools: [],
      userDetails: null,
      previews: [],
      warnings: [
        error instanceof Error
          ? `Initial HubSpot sync failed: ${error.message}`
          : "Initial HubSpot sync failed.",
      ],
    }));

    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_IDS.hubspot,
      status: "live",
      sourceType: "crm",
      config: {
        ...existingConfig,
        sync_strategy: "selective",
        sync_limits: {
          deals: 6,
          companies: 6,
          contacts: 6,
        },
        auth: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_type: tokens.token_type ?? null,
          expires_in: tokens.expires_in ?? null,
          expires_at: tokens.expires_at ?? null,
        },
        oauth_authorized_at: new Date().toISOString(),
        available_tools: selectiveSync.tools.map((tool) => tool.name),
        user_details_preview: selectiveSync.userDetails,
        history_preview: selectiveSync.previews,
        last_synced_at: selectiveSync.previews.length > 0 ? new Date().toISOString() : null,
        last_sync_error: selectiveSync.warnings.length > 0 ? selectiveSync.warnings.join(" ") : null,
      },
    });

    await createIntelligenceEvent(supabase, tenantId, {
      type: "history_synced",
      description:
        selectiveSync.previews.length > 0
          ? `HubSpot connected and selectively synced ${selectiveSync.previews.length} history previews.`
          : "HubSpot connected. Selective history sync is ready, but no preview records were captured yet.",
    }).catch(() => undefined);

    return NextResponse.redirect(
      buildRedirect(request.url, next, "connected", "HubSpot connected successfully.")
    );
  } catch (error) {
    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_IDS.hubspot,
      status: "manual",
      sourceType: "crm",
      config: {
        last_error:
          error instanceof Error ? error.message : "HubSpot authorisation failed for an unknown reason.",
        last_failed_at: new Date().toISOString(),
      },
    }).catch(() => undefined);

    return NextResponse.redirect(
      buildRedirect(
        request.url,
        next,
        "error",
        error instanceof Error ? error.message : "HubSpot authorisation failed."
      )
    );
  }
}
