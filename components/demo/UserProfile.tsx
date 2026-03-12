"use client";

import { useCurrentUserProfile } from "@/lib/auth/useCurrentUserProfile";
import { UserAvatar } from "./Avatar";

interface UserProfileProps {
  /** When true, renders without outer padding for use inside a button/dropdown trigger */
  compact?: boolean;
}

export function UserProfile({ compact }: UserProfileProps = {}) {
  const profile = useCurrentUserProfile();

  if (!profile) return null;

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${compact ? "" : "rounded-lg px-4 py-2"}`}>
      <UserAvatar profile={profile} size={32} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium bb-text-primary">
          {profile.fullName || profile.email || "Account"}
        </p>
        {profile.email && (
          <p className="truncate text-xs text-gray-500">{profile.email}</p>
        )}
      </div>
    </div>
  );
}
