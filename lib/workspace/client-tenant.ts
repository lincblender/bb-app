"use client";

import { createClient } from "@/lib/supabase/client";

export async function fetchCurrentTenantId(): Promise<string | null> {
  const supabase = createClient();
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
