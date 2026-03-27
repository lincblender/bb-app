import { createClient } from "@/lib/supabase/server";

export async function fetchCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (typeof profile?.tenant_id === "string" && profile.tenant_id.length > 0) {
    return profile.tenant_id;
  }

  return `user-${user.id}`;
}

export async function fetchWorkspaceData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const tenantId = await fetchCurrentTenantId();
  if (!tenantId) {
    return null;
  }

  const { fetchWorkspaceData: dataLayerFetch } = await import("@/lib/db/data-layer");
  return dataLayerFetch(tenantId);
}
