/**
 * Supabase Auth callback - handles email confirmation and OAuth redirects
 */

import { createClient } from "@/lib/supabase/server";
import { resolvePostAuthDestination } from "@/lib/auth/post-auth";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import { createIntelligenceEvent, upsertConnectorSource } from "@/lib/connectors/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/console/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const hasLinkedInIdentity =
          user.identities?.some((identity) => identity.provider === "linkedin_oidc") ?? false;

        if (hasLinkedInIdentity) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .maybeSingle();

          const tenantId =
            typeof profile?.tenant_id === "string" && profile.tenant_id.length > 0
              ? profile.tenant_id
              : `user-${user.id}`;
          const { data: existingConnector } = await supabase
            .from("connector_sources")
            .select("status")
            .eq("tenant_id", tenantId)
            .eq("id", CONNECTOR_IDS.linkedin)
            .maybeSingle();

          await upsertConnectorSource(supabase, tenantId, {
            id: CONNECTOR_IDS.linkedin,
            status: "live",
            sourceType: "network",
            config: {
              provider: "linkedin_oidc",
              linked_at: new Date().toISOString(),
              last_verified_at: new Date().toISOString(),
            },
          }).catch(() => undefined);

          if (existingConnector?.status !== "live") {
            await createIntelligenceEvent(supabase, tenantId, {
              type: "connector_synced",
              description: "LinkedIn sign-in identity was connected during sign-in.",
            }).catch(() => undefined);
          }
        }

        const destination = await resolvePostAuthDestination(supabase, user, next);
        return NextResponse.redirect(new URL(destination, request.url));
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback`);
}
