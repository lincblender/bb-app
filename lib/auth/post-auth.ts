import type { SupabaseClient, User } from "@supabase/supabase-js";

function isSafeRelativePath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  return true;
}

export async function resolveCurrentTenantId(
  supabase: SupabaseClient,
  user: User
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  return typeof profile?.tenant_id === "string" && profile.tenant_id.length > 0
    ? profile.tenant_id
    : `user-${user.id}`;
}

export async function resolvePostAuthDestination(
  supabase: SupabaseClient,
  user: User,
  requestedNext?: string | null
): Promise<string> {
  const safeNext = isSafeRelativePath(requestedNext) ? requestedNext : null;

  if (safeNext && safeNext !== "/dashboard") {
    return safeNext;
  }

  const [{ count: opportunityCount }, { count: chatCount }] = await Promise.all([
    supabase.from("opportunities").select("id", { count: "exact", head: true }),
    supabase.from("chats").select("id", { count: "exact", head: true }),
  ]);

  const hasLinkedInIdentity =
    user.identities?.some((identity) => identity.provider === "linkedin_oidc") ?? false;
  const isFirstRun = (opportunityCount ?? 0) === 0 && (chatCount ?? 0) === 0;

  if (isFirstRun) {
    const params = new URLSearchParams();
    params.set("welcome", "1");
    if (hasLinkedInIdentity) {
      params.set("source", "linkedin");
    }
    return `/console/get-started?${params.toString()}`;
  }

  return safeNext ?? "/dashboard";
}
