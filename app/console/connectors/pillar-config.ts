import type { SetupPillarId } from "@/lib/connectors/catalog";

export interface PillarDisplayConfig {
  id: SetupPillarId;
  title: string;
  bullets: string[];
  info: string;
}

export const PILLAR_DISPLAY_CONFIG: Record<SetupPillarId, PillarDisplayConfig> = {
  history: {
    id: "history",
    title: "History",
    bullets: [
      "Your recent deals and contacts",
      "Helps us understand your sales context when working on bids",
    ],
    info: "We pull a small amount from your CRM—enough to be useful, not a full copy. You can add more sources later.",
  },
  opportunity: {
    id: "opportunity",
    title: "Opportunity",
    bullets: [
      "Government tender notices",
      "Current AusTender listings",
    ],
    info: "We use the official AusTender feed. More tender sources can be added later.",
  },
  capability: {
    id: "capability",
    title: "Capability",
    bullets: [
      "What your company is good at",
      "Certifications, past work, case studies",
    ],
    info: "You add this in your organisation profile. It helps us match you to the right opportunities.",
  },
  reach: {
    id: "reach",
    title: "Reach",
    bullets: [
      "Who you are on LinkedIn",
      "Company pages you manage (if any)",
    ],
    info: "Sign in with LinkedIn first. If you manage a company page, you can connect that too so we have the full picture.",
  },
};
