"use client";

import { MapPin } from "lucide-react";
import { getInitials } from "./utils";

interface ProfileHeaderProps {
  name: string;
  location: string;
  logoUrl: string;
  socialCount: number;
}

export function ProfileHeader({
  name,
  location,
  logoUrl,
  socialCount,
}: ProfileHeaderProps) {
  const displayName = name || "Organisation name pending";
  const displayLocation = location || "Location pending";

  return (
    <div className="flex items-end gap-4">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-700 bg-bb-dark p-2 text-xl font-semibold text-gray-100 shadow-lg">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${displayName} logo`}
            className="h-full w-full object-contain"
          />
        ) : (
          getInitials(name || "Organisation")
        )}
      </div>
      <div className="pb-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
          Commingled profile
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-gray-100">{displayName}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-300">
          <span className="inline-flex items-center gap-2">
            <MapPin size={14} className="text-bb-powder-blue" />
            {displayLocation}
          </span>
          <span>{socialCount} social channels tracked</span>
        </div>
      </div>
    </div>
  );
}
