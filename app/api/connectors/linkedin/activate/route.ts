import { NextResponse } from "next/server";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
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

  const { supabase, tenantId, user } = context;
  const hasLinkedInIdentity =
    user.identities?.some((identity) => identity.provider === "linkedin_oidc") ?? false;

  if (!hasLinkedInIdentity) {
    return NextResponse.json(
      { error: "LinkedIn is not authorised for the current user." },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("connector_sources")
    .select("status, config")
    .eq("tenant_id", tenantId)
    .eq("id", CONNECTOR_IDS.linkedin)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingConfig = parseJsonRecord(existing?.config);
  const transitionedToLive = existing?.status !== "live";

  await upsertConnectorSource(supabase, tenantId, {
    id: CONNECTOR_IDS.linkedin,
    status: "live",
    sourceType: "network",
    config: {
      ...existingConfig,
      provider: "linkedin_oidc",
      linked_at: existingConfig.linked_at ?? new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
    },
  });

  if (transitionedToLive) {
    await createIntelligenceEvent(supabase, tenantId, {
      type: "connector_synced",
      description: "LinkedIn sign-in identity is now connected for the reach pillar.",
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
