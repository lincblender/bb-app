"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BbLogo } from "@/components/ui/BbLogo";
import {
  getUserInitials,
  type CurrentUserProfile,
} from "@/lib/auth/useCurrentUserProfile";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  profile: CurrentUserProfile | null;
  size?: number;
  className?: string;
}

interface AssistantAvatarProps {
  size?: number;
  className?: string;
}

export function UserAvatar({ profile, size = 32, className }: UserAvatarProps) {
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatarUrl]);

  if (profile?.avatarUrl && !avatarError) {
    return (
      <Image
        src={profile.avatarUrl}
        alt={profile.fullName ? `${profile.fullName} avatar` : "User avatar"}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={cn(
          "shrink-0 rounded-full border border-white/10 object-cover shadow-sm",
          className
        )}
        unoptimized
        onError={() => setAvatarError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gray-600 text-xs font-semibold text-gray-100 shadow-sm",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {getUserInitials(profile?.fullName || profile?.email)}
    </div>
  );
}

export function AssistantAvatar({ size = 32, className }: AssistantAvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-bb-coral/25 bg-bb-dark-elevated shadow-sm",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <BbLogo size={Math.round(size * 0.58)} />
    </div>
  );
}
