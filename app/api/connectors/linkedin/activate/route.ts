import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import {
  extractProfileFromOidcMetadata,
  type LinkedInProfile,
} from "@/lib/connectors/linkedin-profile";
import {
  createIntelligenceEvent,
  getAuthenticatedTenantContext,
  parseJsonRecord,
  upsertConnectorSource,
} from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/connectors/linkedin/activate
 *
 * Called automatically after LinkedIn OIDC sign-in to:
 *   1. Mark the LinkedIn identity connector as "live"
 *   2. Extract and store the user's profile from OIDC metadata
 *   3. Upsert a person record on the bidder organisation
 */
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

  // ── Extract profile from OIDC user metadata ──────────────────────────────
  const profile = extractProfileFromOidcMetadata(
    (user.user_metadata ?? {}) as Record<string, unknown>
  );

  // ── Upsert connector source with profile data ─────────────────────────────
  const { data: existing } = await supabase
    .from("connector_sources")
    .select("status, config")
    .eq("tenant_id", tenantId)
    .eq("id", CONNECTOR_IDS.linkedin)
    .maybeSingle();

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
      // Profile fields — from OIDC metadata (no additional API call)
      profile_linkedin_id: profile.linkedInId ?? existingConfig.profile_linkedin_id ?? null,
      profile_full_name: profile.fullName ?? existingConfig.profile_full_name ?? null,
      profile_first_name: profile.firstName ?? existingConfig.profile_first_name ?? null,
      profile_last_name: profile.lastName ?? existingConfig.profile_last_name ?? null,
      profile_email: profile.email ?? existingConfig.profile_email ?? null,
      profile_picture_url: profile.pictureUrl ?? existingConfig.profile_picture_url ?? null,
      profile_url: profile.profileUrl ?? existingConfig.profile_url ?? null,
      profile_headline: existingConfig.profile_headline ?? null,
      profile_synced_at: new Date().toISOString(),
      profile_sync_tier: "oidc",
    },
  });

  // ── Upsert person on the bidder organisation ─────────────────────────────
  if (profile.fullName || profile.firstName) {
    await upsertPersonOnBidderOrg(supabase, tenantId, profile);
  }

  if (transitionedToLive) {
    await createIntelligenceEvent(supabase, tenantId, {
      type: "connector_synced",
      description: profile.fullName
        ? `LinkedIn profile connected for ${profile.fullName}.`
        : "LinkedIn sign-in identity is now connected for the reach pillar.",
    }).catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    profile: {
      fullName: profile.fullName,
      pictureUrl: profile.pictureUrl,
      profileUrl: profile.profileUrl,
    },
  });
}

// ---------------------------------------------------------------------------
// Person upsert helper
// ---------------------------------------------------------------------------

async function upsertPersonOnBidderOrg(
  supabase: SupabaseClient,
  tenantId: string,
  profile: LinkedInProfile
) {
  // Find the bidder organisation for this tenant
  const { data: bidder } = await supabase
    .from("organisations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("type", "bidder")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!bidder?.id) return;

  const personId = `person-linkedin-${tenantId}-${profile.linkedInId ?? "unknown"}`;
  const name =
    profile.fullName ??
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ??
    "LinkedIn User";

  // Try to upsert via linkedin_id index if available
  if (profile.linkedInId) {
    await supabase.from("people").upsert(
      {
        id: personId,
        tenant_id: tenantId,
        organisation_id: bidder.id,
        name,
        linkedin_id: profile.linkedInId,
        linkedin_url: profile.profileUrl ?? null,
        avatar_url: profile.pictureUrl ?? null,
        headline: profile.headline ?? null,
        email: profile.email ?? null,
      },
      { onConflict: "tenant_id,linkedin_id", ignoreDuplicates: false }
    );
  } else {
    // No linkedin_id — upsert by stable person ID
    await supabase.from("people").upsert(
      {
        id: personId,
        tenant_id: tenantId,
        organisation_id: bidder.id,
        name,
        linkedin_url: profile.profileUrl ?? null,
        avatar_url: profile.pictureUrl ?? null,
        headline: profile.headline ?? null,
        email: profile.email ?? null,
      },
      { onConflict: "id", ignoreDuplicates: false }
    );
  }
}
