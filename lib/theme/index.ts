/**
 * BidBlender theme – centralized semantic design tokens.
 * Use these class names instead of raw Tailwind colors for consistency.
 *
 * Usage: className={cn(theme.text.primary, theme.spacing.p2)}
 */

export const theme = {
  /** Primary text (headings, important content) */
  text: {
    primary: "text-gray-100",
    secondary: "text-gray-300",
    muted: "text-gray-500",
    inverse: "text-gray-900",
    error: "text-bb-red",
    link: "text-bb-powder-blue",
    accent: "text-bb-mustard",
  },

  /** Backgrounds */
  bg: {
    base: "bg-bb-dark",
    surface: "bg-bb-dark-elevated",
    sidebar: "bg-bb-dark-sidebar",
    input: "bg-bb-dark",
    hover: "hover:bg-gray-700/50",
    hoverSubtle: "hover:bg-gray-600",
  },

  /** Borders */
  border: {
    default: "border-gray-600",
    subtle: "border-gray-700/50",
    focus: "focus:border-bb-coral focus:ring-1 focus:ring-bb-coral",
    hover: "hover:border-gray-500",
  },

  /** Interactive states */
  interactive: {
    navLink: "text-gray-400 hover:text-gray-100",
    navLinkActive: "bg-bb-powder-blue/20 text-bb-powder-blue",
    button: "text-gray-400 hover:bg-gray-700/50 hover:text-gray-100",
    cardHover: "hover:border-gray-500",
    inputFocus: "focus:border-bb-coral focus:outline-none focus:ring-1 focus:ring-bb-coral",
  },

  /** Component presets */
  components: {
    pageTitle: "text-2xl font-bold text-gray-100",
    pageSubtitle: "mt-1 text-gray-400",
    sectionTitle: "font-semibold text-gray-100",
    card: "rounded-lg border border-gray-600 bg-bb-dark-elevated p-4 shadow-card",
    input: "rounded-lg border border-gray-600 bg-bb-dark px-3 py-2 text-gray-100 placeholder-gray-500",
    select: "rounded-lg border border-gray-600 bg-bb-dark px-3 py-2 text-sm text-gray-100",
    checkbox: "rounded border-gray-600 bg-bb-dark text-bb-coral focus:ring-bb-coral",
    suggestedPrompt:
      "rounded-full border border-gray-600 bg-bb-dark-elevated px-4 py-2 text-sm text-gray-300 shadow-sm transition-colors hover:border-bb-coral hover:bg-bb-coral/20",
    listItem: "rounded-lg border border-gray-600 bg-bb-dark-elevated p-4 transition-shadow hover:border-gray-500",
    emptyState: "rounded-lg border border-gray-600 bg-bb-dark-elevated p-12 text-center",
  },
} as const;

export type Theme = typeof theme;
