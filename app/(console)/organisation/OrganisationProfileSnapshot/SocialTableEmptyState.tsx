"use client";

import { PlatformGlyph } from "./PlatformGlyph";
import { PLATFORM_STYLES } from "../social-platforms";
import { PLATFORMS } from "../social-platforms";
import type { Platform } from "../social-platforms";

interface SocialTableEmptyStateProps {
  isEditable: boolean;
  onPlatformClick: (platform: Platform) => void;
}

export function SocialTableEmptyState({
  isEditable,
  onPlatformClick,
}: SocialTableEmptyStateProps) {
  return (
    <div className="rounded-xl border-dashed border-gray-700/80 bg-bb-dark px-4 py-5 text-sm text-gray-400">
      BidBlender AI can populate official social channels here once the right
      company is selected.
      {isEditable && (
      <div className="mt-4 flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => (
          <button
            key={platform}
            type="button"
            onClick={() => onPlatformClick(platform)}
            className="inline-flex items-center justify-center rounded-lg border border-gray-600 p-2 text-gray-400 transition-colors hover:border-bb-powder-blue"
            title={PLATFORM_STYLES[platform].label}
            aria-label={`Add ${PLATFORM_STYLES[platform].label}`}
          >
            <PlatformGlyph platform={platform} size={20} />
          </button>
        ))}
      </div>
      )}
    </div>
  );
}
