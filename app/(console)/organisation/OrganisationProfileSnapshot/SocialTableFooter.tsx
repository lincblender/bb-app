"use client";

import { PlatformGlyph } from "./PlatformGlyph";
import { PLATFORM_STYLES } from "../social-platforms";
import type { Platform } from "../social-platforms";

interface SocialTableFooterProps {
  missingPlatforms: Platform[];
  addingPlatform: Platform | null;
  onPlatformClick: (platform: Platform) => void;
}

export function SocialTableFooter({
  missingPlatforms,
  addingPlatform,
  onPlatformClick,
}: SocialTableFooterProps) {
  if (missingPlatforms.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-t border-gray-700/50 px-4 py-3">
      <span className="mr-2 self-center text-xs text-gray-500">Add:</span>
      {missingPlatforms.map((platform) => {
        const isActive = addingPlatform === platform;
        const btnClass = isActive
          ? "border-bb-powder-blue bg-bb-powder-blue/15"
          : "border-gray-600 hover:border-gray-500";

        return (
          <button
            key={platform}
            type="button"
            onClick={() => onPlatformClick(platform)}
            className={`inline-flex items-center justify-center rounded-lg border p-2 transition-colors ${btnClass}`}
            title={PLATFORM_STYLES[platform].label}
            aria-label={`Add ${PLATFORM_STYLES[platform].label}`}
          >
            <PlatformGlyph platform={platform} size={20} />
          </button>
        );
      })}
    </div>
  );
}
