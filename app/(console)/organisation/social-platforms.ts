/** Supported social and business-intel platforms for organisation profiles */
export const PLATFORMS = [
  "linkedin",
  "youtube",
  "instagram",
  "facebook",
  "x",
  "tiktok",
  "google_business",
  "github",
  "threads",
  "pinterest",
  "crunchbase",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_STYLES: Record<
  Platform,
  { label: string; className: string }
> = {
  linkedin: { label: "LinkedIn", className: "bg-[#0a66c2]/15 text-[#78b7ff]" },
  youtube: { label: "YouTube", className: "bg-[#ff0000]/15 text-[#ff9b9b]" },
  instagram: { label: "Instagram", className: "bg-[#e4405f]/15 text-[#ff9bb4]" },
  facebook: { label: "Facebook", className: "bg-[#1877f2]/15 text-[#8fc5ff]" },
  x: { label: "X", className: "bg-white/10 text-gray-100" },
  tiktok: { label: "TikTok", className: "bg-[#25f4ee]/15 text-[#94fff8]" },
  google_business: {
    label: "Google Business",
    className: "bg-[#4285f4]/15 text-[#8ab4f8]",
  },
  github: { label: "GitHub", className: "bg-gray-700/50 text-gray-300" },
  threads: {
    label: "Threads",
    className: "bg-[#000000]/20 text-gray-200",
  },
  pinterest: {
    label: "Pinterest",
    className: "bg-[#e60023]/15 text-[#ff6b7a]",
  },
  crunchbase: {
    label: "Crunchbase",
    className: "bg-[#0288d1]/15 text-[#4fc3f7]",
  },
};

/** Brand color for each platform's icon. Dark-background brands (X, TikTok, GitHub, Threads) use white for visibility on dark UI. */
export const PLATFORM_COLORS: Record<Platform, string> = {
  linkedin: "#0A66C2",
  youtube: "#FF0000",
  instagram: "#E4405F",
  facebook: "#1877F2",
  x: "#ffffff",
  tiktok: "#ffffff",
  google_business: "#4285F4",
  github: "#ffffff",
  threads: "#ffffff",
  pinterest: "#E60023",
  crunchbase: "#0288D1",
};
