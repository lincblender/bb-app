"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CurrentUserProfile {
  avatarUrl: string | null;
  fullName: string | null;
  email: string | null;
}

export function getUserInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) {
    return "U";
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

function isAllowedImageHost(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname === "media.licdn.com" ||
      parsedUrl.hostname.endsWith(".licdn.com") ||
      parsedUrl.hostname === "lh3.googleusercontent.com" ||
      parsedUrl.hostname.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

export function useCurrentUserProfile() {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (!user) {
        setProfile(null);
        return;
      }

      const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;
      const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
      const email = user.email ?? user.user_metadata?.email ?? null;

      setProfile({
        avatarUrl: avatarUrl && isAllowedImageHost(avatarUrl) ? avatarUrl : null,
        fullName,
        email,
      });
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return profile;
}
