/**
 * BidBlender design tokens – derived from concept UI
 * Prefer semantic classes in app/globals.css (@layer components) over these.
 * Use for dynamic/conditional styling (e.g. Badge variants).
 */

export const colors = {
  positive: "bg-bb-green text-white",
  positiveLight: "bg-bb-green-light text-bb-green",
  warning: "bg-bb-orange text-white",
  warningLight: "bg-bb-orange-light text-orange-800",
  negative: "bg-bb-red text-white",
  negativeLight: "bg-bb-red-light text-bb-red",
  info: "bg-bb-blue text-white",
  infoLight: "bg-bb-blue-light text-bb-blue",
} as const;

export const badgeVariants = {
  high: "bg-bb-green text-white",
  medium: "bg-bb-orange text-white",
  low: "bg-bb-red text-white",
  neutral: "bg-gray-600 text-gray-200",
} as const;
