import {
  Briefcase,
  Building2,
  Compass,
  Grid3X3,
  Network,
  Plug,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";

export const PINNED_SIDEBAR_STORAGE_KEY = "bidblender-pinned-sidebar-surfaces";
export const ONBOARDING_SURFACE_ID = "system:onboarding";

export interface SidebarSurfaceDefinition {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  kind: "screen" | "pseudo";
  href?: string;
  defaultPinned?: boolean;
}

export const ONBOARDING_SURFACE: SidebarSurfaceDefinition = {
  id: ONBOARDING_SURFACE_ID,
  label: "Onboarding",
  description: "Guided setup with predetermined options and live next steps.",
  icon: Compass,
  kind: "pseudo",
  defaultPinned: true,
};

export const PINNABLE_SCREEN_SURFACES: SidebarSurfaceDefinition[] = [
  {
    id: "/settings",
    href: "/settings",
    label: "Settings",
    description: "Workspace settings and source preferences.",
    icon: Settings,
    kind: "screen",
  },
  {
    id: "/opportunities",
    href: "/opportunities",
    label: "Opportunities",
    description: "Opportunity explorer and tender review.",
    icon: Briefcase,
    kind: "screen",
  },
  {
    id: "/organisation",
    href: "/organisation",
    label: "Organisation",
    description: "Capability evidence and organisation profile.",
    icon: Building2,
    kind: "screen",
  },
  {
    id: "/network",
    href: "/network",
    label: "Network",
    description: "Relationship reach and buyer access.",
    icon: Network,
    kind: "screen",
  },
  {
    id: "/matrix",
    href: "/matrix",
    label: "Matrix",
    description: "Visual fit versus reach distribution.",
    icon: Grid3X3,
    kind: "screen",
  },
  {
    id: "/connectors",
    href: "/connectors",
    label: "Connectors",
    description: "Four-pillar setup and live integrations.",
    icon: Plug,
    kind: "screen",
  },
  {
    id: "/strategy",
    href: "/strategy",
    label: "Strategy",
    description: "Strategic posture and pursuit recommendations.",
    icon: Target,
    kind: "screen",
  },
];

export const SIDEBAR_SURFACE_MAP = new Map(
  [ONBOARDING_SURFACE, ...PINNABLE_SCREEN_SURFACES].map((surface) => [surface.id, surface])
);

export const DEFAULT_PINNED_SURFACE_IDS = [ONBOARDING_SURFACE_ID];
