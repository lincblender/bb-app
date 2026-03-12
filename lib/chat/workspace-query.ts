import type { TenantDataContext } from "@/lib/ai/build-context";
import type { AgentResponseBlock } from "./types";

interface WorkspaceLookupResult {
  blocks: AgentResponseBlock[];
}

function extractOpportunitySearchQuery(message: string): string | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const prefixes = [
    /^(?:show me|find|search for|search|open|look at|go to|what about|tell me about)\s+/i,
    /^(?:show|display|get)\s+/i,
  ];

  for (const pattern of prefixes) {
    const match = trimmed.match(pattern);
    if (match) {
      return trimmed.slice(match[0].length).trim() || null;
    }
  }

  if (
    trimmed.length > 0 &&
    trimmed.length <= 80 &&
    !/[?!]/.test(trimmed) &&
    lower.split(/\s+/).length <= 8
  ) {
    return trimmed;
  }

  return null;
}

function getBuyerName(data: TenantDataContext | null, id: string) {
  return data?.buyerOrganisations.find((buyer) => buyer.id === id)?.name ?? "Unknown";
}

function findOpportunityByTitleMatch(data: TenantDataContext | null, query: string) {
  const normalised = query.toLowerCase().trim();
  if (!normalised) {
    return null;
  }

  return (
    data?.opportunities.find((opportunity) => {
      const title = opportunity.title.toLowerCase();
      return title === normalised || normalised.includes(title) || title.includes(normalised);
    }) ?? null
  );
}

function searchOpportunities(data: TenantDataContext | null, query: string) {
  const normalised = query.toLowerCase().trim();
  if (!normalised || !data?.opportunities.length) {
    return [];
  }

  const words = normalised.split(/\s+/).filter((word) => word.length >= 2);

  return data.opportunities
    .filter((opportunity) => {
      const title = opportunity.title.toLowerCase();
      const issuer = getBuyerName(data, opportunity.issuingOrganisationId).toLowerCase();
      const category = opportunity.category.toLowerCase();

      if (title.includes(normalised) || issuer.includes(normalised) || category.includes(normalised)) {
        return true;
      }

      return words.length > 0 && words.every((word) => title.includes(word) || issuer.includes(word));
    })
    .slice(0, 5)
    .map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      issuer: getBuyerName(data, opportunity.issuingOrganisationId),
      fit: Math.round(
        ((opportunity.assessment?.technicalFit ?? 0) + (opportunity.assessment?.networkStrength ?? 0)) / 2
      ),
    }));
}

export function resolveWorkspaceOpportunityLookup(
  message: string,
  data: TenantDataContext | null,
  hasOpportunityContext = false
): WorkspaceLookupResult | null {
  if (hasOpportunityContext || !data?.opportunities.length) {
    return null;
  }

  const query = extractOpportunitySearchQuery(message);
  if (!query) {
    return null;
  }

  const exactMatch = findOpportunityByTitleMatch(data, query);
  if (exactMatch) {
    return {
      blocks: [
        {
          type: "text",
          content: `Selected **${exactMatch.title}** from your workspace.`,
        },
        {
          type: "select_opportunity",
          content: "",
          opportunityId: exactMatch.id,
        },
        {
          type: "cta",
          content: "Open the opportunity context for full detail.",
          ctaText: "View opportunity",
          ctaAction: "opportunities",
          ctaHref: `/console/opportunities/${exactMatch.id}`,
        },
      ],
    };
  }

  const matches = searchOpportunities(data, query);
  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return {
      blocks: [
        {
          type: "text",
          content: `Found **${matches[0].title}** in your workspace.`,
        },
        {
          type: "select_opportunity",
          content: "",
          opportunityId: matches[0].id,
        },
        {
          type: "cta",
          content: "Open the opportunity context for full detail.",
          ctaText: "View opportunity",
          ctaAction: "opportunities",
          ctaHref: `/console/opportunities/${matches[0].id}`,
        },
      ],
    };
  }

  return {
    blocks: [
      {
        type: "text",
        content: `I found ${matches.length} matching opportunities in your workspace.`,
      },
      {
        type: "opportunities",
        content: "",
        opportunities: matches,
      },
    ],
  };
}
