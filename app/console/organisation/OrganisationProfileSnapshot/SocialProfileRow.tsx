"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { PlatformGlyph } from "./PlatformGlyph";
import { formatMetric, formatLastPostDate } from "./utils";
import { PLATFORM_STYLES } from "../social-platforms";
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

interface SocialProfileRowProps {
  profile: SocialProfile;
  index: number;
  isEditing: boolean;
  isMenuOpen: boolean;
  onEdit: (index: number) => void;
  onRemove?: (index: number) => void;
  onMenuToggle: (index: number | null) => void;
  onUpdate: (index: number, url: string, handle: string) => void;
  onEditDone: () => void;
}

export function SocialProfileRow({
  profile,
  index,
  isEditing,
  isMenuOpen,
  onEdit,
  onRemove,
  onMenuToggle,
  onUpdate,
  onEditDone,
}: SocialProfileRowProps) {
  const style = PLATFORM_STYLES[profile.platform];
  const menuRef = useRef<HTMLDivElement>(null);
  const [editUrl, setEditUrl] = useState(profile.url);
  const [editHandle, setEditHandle] = useState(profile.handle);

  useEffect(() => {
    if (isEditing) {
      setEditUrl(profile.url);
      setEditHandle(profile.handle);
    }
  }, [isEditing, profile.url, profile.handle]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuToggle(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isMenuOpen, onMenuToggle]);

  const handleSaveEdit = () => {
    onUpdate(index, editUrl.trim(), editHandle.trim());
    onEditDone();
  };

  if (isEditing) {
    return (
      <tr className="bg-bb-dark/80 text-gray-200">
        <td className="px-4 py-3" colSpan={5}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.className}`}
            >
              <PlatformGlyph platform={profile.platform} />
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <input
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="Profile URL"
                className="flex-1 rounded-lg border border-gray-600 bg-bb-dark px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-bb-coral focus:outline-none focus:ring-1 focus:ring-bb-coral"
              />
              <input
                type="text"
                value={editHandle}
                onChange={(e) => setEditHandle(e.target.value)}
                placeholder="Handle"
                className="w-32 rounded-lg border border-gray-600 bg-bb-dark px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-bb-coral focus:outline-none focus:ring-1 focus:ring-bb-coral"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded-lg border border-bb-powder-blue bg-bb-powder-blue/20 px-3 py-2 text-sm text-bb-powder-blue hover:bg-bb-powder-blue/30"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onEditDone}
                  className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-400 hover:text-gray-200"
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

  return (
    <tr className="bg-bb-dark text-gray-200">
      <td className="px-4 py-3">
        <div className="flex items-center justify-center">
          {profile.url ? (
            <a
              href={profile.url}
              target="_blank"
              rel="noreferrer"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 ${style.className}`}
              aria-label={`Open ${style.label}`}
            >
              <PlatformGlyph platform={profile.platform} />
            </a>
          ) : (
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.className}`}
            >
              <PlatformGlyph platform={profile.platform} />
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatMetric(profile.follows)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatMetric(profile.followers)}
      </td>
      <td className="px-4 py-3 text-right">
        {formatLastPostDate(profile.lastPostDate)}
      </td>
      <td className="px-2 py-3">
        <div className="relative flex justify-end" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle(isMenuOpen ? null : index);
            }}
            className="inline-flex rounded p-1.5 text-gray-500 hover:text-gray-300"
            aria-label="Actions"
          >
            <MoreVertical size={16} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 min-w-[120px] rounded-lg border border-gray-600 bg-bb-dark py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  onEdit(index);
                  onMenuToggle(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700/50"
              >
                <Pencil size={14} />
                Edit
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => {
                    onRemove(index);
                    onMenuToggle(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700/50 hover:text-bb-coral"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
