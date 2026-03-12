"use client";

import { ExternalLink, Globe, Linkedin } from "lucide-react";

const LINK_CLASS =
  "inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-100 hover:border-bb-powder-blue hover:text-white";

interface SocialLinksBarProps {
  websiteUrl?: string;
  linkedinUrl?: string;
}

export function SocialLinksBar({ websiteUrl, linkedinUrl }: SocialLinksBarProps) {
  if (!websiteUrl && !linkedinUrl) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {websiteUrl && (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noreferrer"
          className={LINK_CLASS}
        >
          <Globe size={14} />
          Website
          <ExternalLink size={14} />
        </a>
      )}
      {linkedinUrl && (
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noreferrer"
          className={LINK_CLASS}
        >
          <Linkedin size={14} />
          LinkedIn
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
