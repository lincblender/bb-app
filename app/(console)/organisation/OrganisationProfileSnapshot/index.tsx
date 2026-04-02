"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { ProfileHeader } from "./ProfileHeader";
import { SocialLinksBar } from "./SocialLinksBar";
import { SocialTable } from "./SocialTable";
import { PLATFORMS } from "../social-platforms";
import type { Platform } from "../social-platforms";
import type { OrganisationProfileFormState } from "../types";

interface OrganisationProfileSnapshotProps {
  profile: OrganisationProfileFormState;
  onAddSocialProfile?: (profile: {
    platform: Platform;
    url: string;
    handle: string;
  }) => void;
  onRemoveSocialProfile?: (index: number) => void;
  onUpdateSocialProfile?: (
    index: number,
    updates: { url: string; handle: string }
  ) => void;
  onSearchSocialProfiles?: (
    platform: Platform,
    searchQuery: string
  ) => Promise<{ url: string; handle: string }[]>;
  socialSearchMatches?: { url: string; handle: string }[];
  socialSearchLoading?: boolean;
  onClearSocialSearch?: () => void;
}

const CARD_GRADIENT =
  "h-28 bg-[radial-gradient(circle_at_top_left,_rgba(248,107,107,0.34),_transparent_38%),linear-gradient(135deg,_rgba(17,24,39,0.92),_rgba(28,39,56,0.98)_55%,_rgba(118,176,255,0.2))]";

const DESCRIPTION_FALLBACK =
  "Use BidBlender AI or fill the form below to build out the organisation profile.";

export function OrganisationProfileSnapshot({
  profile,
  onAddSocialProfile,
  onRemoveSocialProfile,
  onUpdateSocialProfile,
  onSearchSocialProfiles,
  socialSearchMatches = [],
  socialSearchLoading = false,
  onClearSocialSearch,
}: OrganisationProfileSnapshotProps) {
  const socialProfiles = profile.socialProfiles ?? [];
  const [addingPlatform, setAddingPlatform] = useState<Platform | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProfileIndex, setEditingProfileIndex] = useState<number | null>(
    null
  );
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

  const hasPlatform = useCallback(
    (platform: Platform) => socialProfiles.some((p) => p.platform === platform),
    [socialProfiles]
  );

  const missingPlatforms = PLATFORMS.filter((p) => !hasPlatform(p));

  const handlePlatformClick = useCallback(
    (platform: Platform) => {
      if (addingPlatform === platform) {
        setAddingPlatform(null);
        setSearchQuery("");
        onClearSocialSearch?.();
      } else {
        setAddingPlatform(platform);
        setSearchQuery("");
        onClearSocialSearch?.();
      }
    },
    [addingPlatform, onClearSocialSearch]
  );

  const handleSearch = useCallback(async () => {
    if (!addingPlatform || !onSearchSocialProfiles || !searchQuery.trim()) return;
    await onSearchSocialProfiles(addingPlatform, searchQuery.trim());
  }, [addingPlatform, onSearchSocialProfiles, searchQuery]);

  const handleSelectMatch = useCallback(
    (match: { url: string; handle: string }) => {
      if (!addingPlatform || !onAddSocialProfile) return;
      onAddSocialProfile({
        platform: addingPlatform,
        url: match.url,
        handle: match.handle,
      });
      setAddingPlatform(null);
      setSearchQuery("");
      onClearSocialSearch?.();
    },
    [addingPlatform, onAddSocialProfile, onClearSocialSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const isEditable = Boolean(onAddSocialProfile && onSearchSocialProfiles);

  const handleUpdateProfile = useCallback(
    (index: number, url: string, handle: string) => {
      onUpdateSocialProfile?.(index, { url, handle });
    },
    [onUpdateSocialProfile]
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className={CARD_GRADIENT} />
      <div className="px-6 pb-6">
        <div className="-mt-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <ProfileHeader
            name={profile.name || ""}
            location={profile.location || ""}
            logoUrl={profile.logoUrl || ""}
            socialCount={socialProfiles.length}
          />
          <SocialLinksBar
            websiteUrl={profile.websiteUrl}
            linkedinUrl={profile.linkedinUrl}
          />
        </div>

        <p className="mt-5 max-w-4xl text-sm leading-relaxed text-gray-300">
          {profile.description || DESCRIPTION_FALLBACK}
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border border-gray-700/80">
          <SocialTable
            profiles={socialProfiles}
            missingPlatforms={missingPlatforms}
            addingPlatform={addingPlatform}
            searchQuery={searchQuery}
            searchMatches={socialSearchMatches}
            searchLoading={socialSearchLoading}
            isEditable={isEditable}
            onPlatformClick={handlePlatformClick}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            onSelectMatch={handleSelectMatch}
            onKeyDown={handleKeyDown}
            onRemoveProfile={onRemoveSocialProfile}
            onEditProfile={setEditingProfileIndex}
            onEditProfileDone={() => setEditingProfileIndex(null)}
            onUpdateProfile={handleUpdateProfile}
            onMenuToggle={setOpenMenuIndex}
            editingProfileIndex={editingProfileIndex}
            openMenuIndex={openMenuIndex}
          />
        </div>
      </div>
    </Card>
  );
}
