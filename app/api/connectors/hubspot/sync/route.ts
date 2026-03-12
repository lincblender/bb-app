import { NextResponse } from "next/server";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import {
  getHubSpotTokensFromConfig,
  isHubSpotTokenExpired,
  refreshHubSpotAuthorization,
  runHubSpotSelectiveSync,
} from "@/lib/connectors/hubspot";
import {
  createIntelligenceEvent,
  getAuthenticatedTenantContext,
  parseJsonRecord,
  upsertConnectorSource,
} from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { supabase, tenantId } = context;
  const { data: connector, error: connectorError } = await supabase
    .from("connector_sources")
    .select("config")
    .eq("tenant_id", tenantId)
    .eq("id", CONNECTOR_IDS.hubspot)
    .maybeSingle();

  if (connectorError) {
    return NextResponse.json({ error: connectorError.message }, { status: 500 });
  }

  const existingConfig = parseJsonRecord(connector?.config);
  const existingTokens = getHubSpotTokensFromConfig(existingConfig);
  if (!existingTokens) {
    return NextResponse.json(
      { error: "HubSpot is not authorised for this workspace yet." },
      { status: 400 }
    );
  }

  try {
    const tokens =
      isHubSpotTokenExpired(existingTokens) && existingTokens.refresh_token
        ? await refreshHubSpotAuthorization(existingTokens.refresh_token)
        : existingTokens;

    const syncResult = await runHubSpotSelectiveSync(tokens.access_token);

    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_IDS.hubspot,
      status: "live",
      sourceType: "crm",
      config: {
        ...existingConfig,
        auth: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_type: tokens.token_type ?? null,
          expires_in: tokens.expires_in ?? null,
          expires_at: tokens.expires_at ?? null,
        },
        available_tools: syncResult.tools.map((tool) => tool.name),
        user_details_preview: syncResult.userDetails,
        history_preview: syncResult.previews,
        last_synced_at: new Date().toISOString(),
        last_sync_error: syncResult.warnings.length > 0 ? syncResult.warnings.join(" ") : null,
      },
    });

    await createIntelligenceEvent(supabase, tenantId, {
      type: "history_synced",
      description:
        syncResult.previews.length > 0
          ? `HubSpot selective sync refreshed ${syncResult.previews.length} history previews.`
          : "HubSpot selective sync completed without readable history previews.",
    }).catch(() => undefined);

    return NextResponse.json({
      synced: true,
      previews: syncResult.previews,
      warnings: syncResult.warnings,
      tools: syncResult.tools.map((tool) => tool.name),
    });
  } catch (error) {
    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_IDS.hubspot,
      status: "manual",
      sourceType: "crm",
      config: {
        ...existingConfig,
        last_sync_error:
          error instanceof Error ? error.message : "HubSpot selective sync failed.",
        last_failed_at: new Date().toISOString(),
      },
    }).catch(() => undefined);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "HubSpot selective sync failed.",
      },
      { status: 500 }
    );
  }
}
