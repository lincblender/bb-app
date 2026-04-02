"use client";

import { SocialProfileRow } from "./SocialProfileRow";
import { SocialProfileSearchRow } from "./SocialProfileSearchRow";
import { SocialProfileMatchRow } from "./SocialProfileMatchRow";
import { SocialTableFooter } from "./SocialTableFooter";
import { SocialTableEmptyState } from "./SocialTableEmptyState";
import type { Platform } from "../social-platforms";

interface SocialProfile {
  id?: string | null;
  platform: Platform;
  url: string;
  handle: string;
  follows?: number | null;
  followers?: number | null;
  lastPostDate?: string;
}

interface SocialTableProps {
  profiles: SocialProfile[];
  missingPlatforms: Platform[];
  addingPlatform: Platform | null;
  searchQuery: string;
  searchMatches: { url: string; handle: string }[];
  searchLoading: boolean;
  isEditable: boolean;
  editingProfileIndex: number | null;
  openMenuIndex: number | null;
  onPlatformClick: (platform: Platform) => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelectMatch: (match: { url: string; handle: string }) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onRemoveProfile?: (index: number) => void;
  onEditProfile: (index: number) => void;
  onEditProfileDone: () => void;
  onUpdateProfile: (index: number, url: string, handle: string) => void;
  onMenuToggle: (index: number | null) => void;
}

const METRICS_NOTE =
  "Metrics are populated when publicly available. Full follower counts may require a future integration with platform APIs.";

export function SocialTable({
  profiles,
  missingPlatforms,
  addingPlatform,
  searchQuery,
  searchMatches,
  searchLoading,
  isEditable,
  onPlatformClick,
  onSearchQueryChange,
  onSearch,
  onSelectMatch,
  onKeyDown,
  onRemoveProfile,
  onEditProfile,
  onEditProfileDone,
  onUpdateProfile,
  onMenuToggle,
  editingProfileIndex,
  openMenuIndex,
}: SocialTableProps) {
  const hasContent = profiles.length > 0 || addingPlatform;

  if (!hasContent) {
    return (
      <SocialTableEmptyState
        isEditable={isEditable}
        onPlatformClick={onPlatformClick}
      />
    );
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700/80 bg-bb-dark/50">
            <th className="w-14 px-2 py-3" aria-label="Platform" />
            <th className="px-4 py-3 text-right font-medium text-gray-400">
              Follows
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">
              Followers
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">
              Last post
            </th>
            <th className="w-12 px-2 py-3" aria-label="Actions" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {profiles.map((profile, index) => (
            <SocialProfileRow
              key={profile.id ?? `${profile.platform}-${profile.url}`}
              profile={profile}
              index={index}
              isEditing={editingProfileIndex === index}
              isMenuOpen={openMenuIndex === index}
              onEdit={onEditProfile}
              onRemove={onRemoveProfile}
              onMenuToggle={onMenuToggle}
              onUpdate={onUpdateProfile}
              onEditDone={onEditProfileDone}
            />
          ))}
          {addingPlatform && (
            <>
              <SocialProfileSearchRow
                platform={addingPlatform}
                searchQuery={searchQuery}
                isLoading={searchLoading}
                onQueryChange={onSearchQueryChange}
                onSearch={onSearch}
                onCancel={() => onPlatformClick(addingPlatform)}
                onKeyDown={onKeyDown}
              />
              {searchMatches.map((match, i) => (
                <SocialProfileMatchRow
                  key={`${match.url}-${i}`}
                  match={match}
                  onSelect={onSelectMatch}
                />
              ))}
            </>
          )}
        </tbody>
      </table>
      <p className="border-t border-gray-700/50 px-4 py-2 text-xs text-gray-500">
        {METRICS_NOTE}
      </p>
      {isEditable && (
        <SocialTableFooter
          missingPlatforms={missingPlatforms}
          addingPlatform={addingPlatform}
          onPlatformClick={onPlatformClick}
        />
      )}
    </>
  );
}
