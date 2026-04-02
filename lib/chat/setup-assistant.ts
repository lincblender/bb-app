import { countReadyPillars, getIncompletePillars, type SetupPillarStatus } from "@/lib/connectors/setup-status";
import type { AgentResponseBlock } from "./types";

function includesAny(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term));
}

function buildPillarCta(status: SetupPillarStatus): AgentResponseBlock {
  return {
    type: "cta",
    content: status.detail,
    ctaText:
      status.status === "ready"
        ? "Review setup"
        : status.id === "capability"
          ? "Open organisation profile"
          : "Continue setup",
    ctaAction: status.id,
    ctaHref: status.href,
  };
}

export function resolveSetupAssistant(
  message: string,
  statuses: SetupPillarStatus[]
): AgentResponseBlock[] | null {
  const text = message.toLowerCase();

  if (includesAny(text, ["github", "slack", "google drive", "notion"])) {
    return [
      {
        type: "text",
        content:
          "Those broader MCP sources are not wired into the four-pillar setup yet. The real setup path today is LinkedIn for reach, HubSpot for selective history, the organisation profile for capability, and AusTender for opportunities.",
      },
      {
        type: "cta",
        content: "Open connectors to continue the live setup path.",
        ctaText: "Open connectors",
        ctaAction: "connectors",
        ctaHref: "/connectors",
      },
    ];
  }

  const hubspotStatus = statuses.find((status) => status.id === "history");
  if (hubspotStatus && includesAny(text, ["hubspot", "crm", "history", "sales history"])) {
    return [
      {
        type: "text",
        content:
          "HubSpot is handled as a selective history source. BidBlender should pull only the essential recent deal, company, and contact context, then fetch more when a client or opportunity needs it.",
      },
      buildPillarCta(hubspotStatus),
    ];
  }

  const linkedInStatus = statuses.find((status) => status.id === "reach");
  if (linkedInStatus && includesAny(text, ["linkedin", "reach", "profile", "network"])) {
    return [
      {
        type: "text",
        content:
          "The setup should start with LinkedIn so the user profile and relationship reach are grounded in a real identity before other data starts spooling in.",
      },
      buildPillarCta(linkedInStatus),
    ];
  }

  const austenderStatus = statuses.find((status) => status.id === "opportunity");
  if (austenderStatus && includesAny(text, ["austender", "tender", "opportunity", "rss"])) {
    return [
      {
        type: "text",
        content:
          "AusTender is the live opportunity source for now. The app imports a limited set of current notices from the official RSS feed and enriches further only when the user opens a relevant opportunity.",
      },
      buildPillarCta(austenderStatus),
    ];
  }

  const capabilityStatus = statuses.find((status) => status.id === "capability");
  if (capabilityStatus && includesAny(text, ["organisation", "capability", "capabilities", "profile setup"])) {
    return [
      {
        type: "text",
        content:
          "The capability pillar lives in the organisation profile for now. That is where BidBlender should capture curated capability evidence, not scrape or mirror a separate source system.",
      },
      buildPillarCta(capabilityStatus),
    ];
  }

  if (
    !includesAny(text, [
      "setup",
      "set up",
      "connect",
      "connector",
      "getting started",
      "get started",
      "onboarding",
      "four pillars",
    ])
  ) {
    return null;
  }

  const incomplete = getIncompletePillars(statuses).slice(0, 3);
  const readyCount = countReadyPillars(statuses);

  return [
    {
      type: "text",
      content: `The live setup path is the four pillars: reach, history, capability, and opportunity. ${readyCount} of 4 pillars are currently ready in this workspace.`,
    },
    ...incomplete.map(buildPillarCta),
  ];
}
