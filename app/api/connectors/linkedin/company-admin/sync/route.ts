import { NextResponse } from "next/server";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import {
  buildLinkedInCompanyAdminConnectorConfig,
  getLinkedInCompanyAdminTokensFromConfig,
  isLinkedInCompanyAdminTokenExpired,
  runLinkedInCompanyAdminSync,
} from "@/lib/connectors/linkedin-company-admin";
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
    .eq("id", CONNECTOR_IDS.linkedinCompanyAdmin)
    .maybeSingle();

  if (connectorError) {
    return NextResponse.json({ error: connectorError.message }, { status: 500 });
  }

  const existingConfig = parseJsonRecord(connector?.config);
  const tokens = getLinkedInCompanyAdminTokensFromConfig(existingConfig);
  if (!tokens) {
    return NextResponse.json(
      { error: "LinkedIn company-page access is not authorised for this workspace yet." },
      { status: 400 }
    );
  }

  if (isLinkedInCompanyAdminTokenExpired(tokens)) {
    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_IDS.linkedinCompanyAdmin,
      status: "manual",
      sourceType: "network",
      config: {
        ...existingConfig,
        last_sync_error: "LinkedIn company-page access expired. Reconnect LinkedIn company pages.",
        last_failed_at: new Date().toISOString(),
      },
    }).catch(() => undefined);

    return NextResponse.json(
      { error: "LinkedIn company-page access expired. Reconnect LinkedIn company pages." },
      { status: 400 }
    );
  }

  try {
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
          ? `LinkedIn company-page sync refreshed ${syncResult.organizations.length} administered organizations.`
          : "LinkedIn company-page sync completed without approved organization roles.",
    }).catch(() => undefined);

    return NextResponse.json({
      synced: true,
      organizations: syncResult.organizations,
      warnings: syncResult.warnings,
      roleAssignments: syncResult.roleAssignments,
    });
  } catch (error) {
    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_IDS.linkedinCompanyAdmin,
      status: "manual",
      sourceType: "network",
      config: {
        ...existingConfig,
        last_sync_error:
          error instanceof Error ? error.message : "LinkedIn company-page sync failed.",
        last_failed_at: new Date().toISOString(),
      },
    }).catch(() => undefined);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "LinkedIn company-page sync failed.",
      },
      { status: 500 }
    );
  }
}
