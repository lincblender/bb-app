import { NextResponse } from "next/server";
import { CONNECTOR_IDS, getCoreConnectorDefinition } from "@/lib/connectors/catalog";
import { getAuthenticatedTenantContext, upsertConnectorSource } from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedTenantContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await request.json();
    const clientId = typeof body.client_id === "string" ? body.client_id.trim() : undefined;
    const clientSecret = typeof body.client_secret === "string" ? body.client_secret.trim() : undefined;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Both client_id and client_secret are required." },
        { status: 400 }
      );
    }

    const catalogConnector = getCoreConnectorDefinition(CONNECTOR_IDS.linkedinCompanyAdmin);
    await upsertConnectorSource(context.supabase, context.tenantId, {
      id: CONNECTOR_IDS.linkedinCompanyAdmin,
      type: catalogConnector?.sourceType ?? "network",
      name: catalogConnector?.name ?? "LinkedIn Company Pages",
      status: "disconnected",
      sourceType: catalogConnector?.sourceType ?? "network",
      contribution: catalogConnector?.contribution,
      config: {
        linkedin_client_id: clientId,
        linkedin_client_secret: clientSecret,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed." },
      { status: 500 }
    );
  }
}
