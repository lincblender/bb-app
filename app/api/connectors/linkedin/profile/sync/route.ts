/**
 * POST /api/connectors/linkedin/profile/sync
 *
 * Re-syncs the connected user's LinkedIn profile.
 * Called explicitly from the connectors page "Sync" button on the Reach pillar.
 *
 * Gathering tiers attempted in order:
 *   1. OIDC user_metadata (always available, no API call)
 *   2. LinkedIn REST /me (if company-admin token available + profile scope granted)
 *
 * Tier 2 requires the user to have connected company-admin OAuth with the
 * `r_liteprofile` scope included. If not available, tier 1 is used alone.
 *
 * Body (optional):
 *   { providerToken?: string }  — LinkedIn OIDC provider token from client session,
 *                                 enables /userinfo call for a more current profile.
 */

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import {
  extractProfileFromOidcMetadata,
  fetchLinkedInUserInfo,
  fetchLinkedInMeProfile,
  mergeLinkedInProfiles,
  type LinkedInProfile,
} from "@/lib/connectors/linkedin-profile";
import {
  getLinkedInCompanyAdminTokensFromConfig,
  isLinkedInCompanyAdminTokenExpired,
} from "@/lib/connectors/linkedin-company-admin";
import {
  createIntelligenceEvent,
  getAuthenticatedTenantContext,
  parseJsonRecord,
  upsertConnectorSource,
} from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { supabase, tenantId, user } = context;

  const hasLinkedInIdentity =
    user.identities?.some((i) => i.provider === "linkedin_oidc") ?? false;

  if (!hasLinkedInIdentity) {
    return NextResponse.json(
      { error: "LinkedIn is not connected for this account." },
      { status: 400 }
    );
  }

  // Optional provider token from client
  let providerToken: string | null = null;
  try {
    const body = (await request.json()) as { providerToken?: string };
    providerToken = typeof body.providerToken === "string" ? body.providerToken : null;
  } catch {
    // empty body fine
  }

  // ── Tier 1: OIDC metadata ───────────────────────────────────────────────
  let profile = extractProfileFromOidcMetadata(
    (user.user_metadata ?? {}) as Record<string, unknown>
  );
  let syncTier = "oidc";

  // ── Tier 2a: /userinfo with provider token ──────────────────────────────
  if (providerToken) {
    try {
      const userInfo = await fetchLinkedInUserInfo(providerToken);
      profile = mergeLinkedInProfiles(profile, userInfo);
      syncTier = "userinfo";
    } catch (err) {
      console.warn("[linkedin-profile/sync] /userinfo failed:", err instanceof Error ? err.message : err);
    }
  }

  // ── Tier 2b: REST /me with company-admin token ──────────────────────────
  const { data: companyAdminConnector } = await supabase
    .from("connector_sources")
    .select("config")
    .eq("tenant_id", tenantId)
    .eq("id", CONNECTOR_IDS.linkedinCompanyAdmin)
    .maybeSingle();

  if (companyAdminConnector) {
    const tokens = getLinkedInCompanyAdminTokensFromConfig(
      parseJsonRecord(companyAdminConnector.config)
    );
    if (tokens && !isLinkedInCompanyAdminTokenExpired(tokens)) {
      try {
        const meProfile = await fetchLinkedInMeProfile(tokens.access_token);
        profile = mergeLinkedInProfiles(profile, meProfile);
        syncTier = "rest_me";
      } catch (err) {
        console.warn("[linkedin-profile/sync] /me failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  // ── Store profile in connector config ───────────────────────────────────
  const { data: existing } = await supabase
    .from("connector_sources")
    .select("config")
    .eq("tenant_id", tenantId)
    .eq("id", CONNECTOR_IDS.linkedin)
    .maybeSingle();

  const existingConfig = parseJsonRecord(existing?.config);

  await upsertConnectorSource(supabase, tenantId, {
    id: CONNECTOR_IDS.linkedin,
    status: "live",
    sourceType: "network",
    config: {
      ...existingConfig,
      profile_linkedin_id: profile.linkedInId ?? existingConfig.profile_linkedin_id ?? null,
      profile_full_name: profile.fullName ?? existingConfig.profile_full_name ?? null,
      profile_first_name: profile.firstName ?? existingConfig.profile_first_name ?? null,
      profile_last_name: profile.lastName ?? existingConfig.profile_last_name ?? null,
      profile_email: profile.email ?? existingConfig.profile_email ?? null,
      profile_picture_url: profile.pictureUrl ?? existingConfig.profile_picture_url ?? null,
      profile_url: profile.profileUrl ?? existingConfig.profile_url ?? null,
      profile_headline: profile.headline ?? existingConfig.profile_headline ?? null,
      profile_synced_at: new Date().toISOString(),
      profile_sync_tier: syncTier,
    },
  });

  // ── Upsert person record ─────────────────────────────────────────────────
  if (profile.fullName || profile.firstName) {
    await upsertPersonOnBidderOrg(supabase, tenantId, profile);
  }

  await createIntelligenceEvent(supabase, tenantId, {
    type: "connector_synced",
    description: `LinkedIn profile synced${profile.fullName ? ` for ${profile.fullName}` : ""} (tier: ${syncTier}).`,
  }).catch(() => undefined);

  return NextResponse.json({
    synced: true,
    syncTier,
    profile: {
      fullName: profile.fullName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      pictureUrl: profile.pictureUrl,
      profileUrl: profile.profileUrl,
      headline: profile.headline,
    },
  });
}

// ---------------------------------------------------------------------------
// Person upsert
// ---------------------------------------------------------------------------

async function upsertPersonOnBidderOrg(
  supabase: SupabaseClient,
  tenantId: string,
  profile: LinkedInProfile
) {
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

  const row = {
    id: personId,
    tenant_id: tenantId,
    organisation_id: bidder.id,
    name,
    linkedin_id: profile.linkedInId ?? null,
    linkedin_url: profile.profileUrl ?? null,
    avatar_url: profile.pictureUrl ?? null,
    headline: profile.headline ?? null,
    email: profile.email ?? null,
    updated_at: new Date().toISOString(),
  };

  if (profile.linkedInId) {
    await supabase
      .from("people")
      .upsert(row, { onConflict: "tenant_id,linkedin_id", ignoreDuplicates: false })
      .then(() => undefined);
  } else {
    await supabase
      .from("people")
      .upsert(row, { onConflict: "id", ignoreDuplicates: false })
      .then(() => undefined);
  }
}
