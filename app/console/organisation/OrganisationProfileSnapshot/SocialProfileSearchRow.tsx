"use client";

import { Search } from "lucide-react";
import { PlatformGlyph } from "./PlatformGlyph";
import { PLATFORM_STYLES } from "../social-platforms";
import type { Platform } from "../social-platforms";

interface SocialProfileSearchRowProps {
  platform: Platform;
  searchQuery: string;
  isLoading: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const INPUT_CLASS =
  "flex-1 rounded-lg border border-gray-600 bg-bb-dark px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-bb-coral focus:outline-none focus:ring-1 focus:ring-bb-coral";

const BTN_BASE = "rounded-lg border border-gray-600 px-3 py-2 text-sm";
const BTN_SEARCH = "inline-flex items-center gap-2 text-gray-300 hover:border-bb-powder-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-50";
const BTN_CANCEL = "text-gray-400 hover:text-gray-200";

export function SocialProfileSearchRow({
  platform,
  searchQuery,
  isLoading,
  onQueryChange,
  onSearch,
  onCancel,
  onKeyDown,
}: SocialProfileSearchRowProps) {
  const style = PLATFORM_STYLES[platform];
  const placeholder = `Search for ${style.label} profile (company name or handle)…`;

  return (
    <tr className="bg-bb-dark/80 text-gray-200">
      <td className="px-4 py-3" colSpan={5}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.className}`}
          >
            <PlatformGlyph platform={platform} />
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              className={INPUT_CLASS}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSearch}
                disabled={isLoading || !searchQuery.trim()}
                className={`${BTN_BASE} ${BTN_SEARCH}`}
              >
                {isLoading ? "Searching…" : (
                  <>
                    <Search size={14} />
                    Search
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className={`${BTN_BASE} ${BTN_CANCEL}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
