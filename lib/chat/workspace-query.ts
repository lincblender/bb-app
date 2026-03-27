import type { TenantDataContext } from "@/lib/ai/build-context";
import type { AgentResponseBlock } from "./types";

interface WorkspaceLookupResult {
  blocks: AgentResponseBlock[];
}

function extractOpportunitySearchQuery(message: string): { query: string, explicit: boolean } | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const prefixes = [
    /^(?:show me|find|search for|search|open|look at|go to|what about|tell me about)\s+/i,
    /^(?:show|display|get)\s+/i,
  ];

  for (const pattern of prefixes) {
    const match = trimmed.match(pattern);
    if (match) {
      const q = trimmed.slice(match[0].length).trim();
      return q ? { query: q, explicit: true } : null;
    }
  }

  if (
    trimmed.length > 0 &&
    trimmed.length <= 80 &&
    !/[?!]/.test(trimmed) &&
    lower.split(/\s+/).length <= 8
  ) {
    return { query: trimmed, explicit: false };
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
    // If they explicitly search but have no opps loaded, still trap it if explicit
    const x = extractOpportunitySearchQuery(message);
    if (x?.explicit && !hasOpportunityContext) {
       return {
         blocks: [
           {
             type: "text",
             content: `I couldn't find any mapped opportunities for "**${x.query}**". Your workspace might be empty or missing connectors.`,
           }
         ]
       };
    }
    return null;
  }

  const lowerMessage = message.toLowerCase().trim();
  const isGenericDiscovery =
    lowerMessage.includes("latest matching bids") ||
    lowerMessage.includes("what's new") ||
    lowerMessage.includes("missing any opportunities") ||
    (lowerMessage.includes("show me") && lowerMessage.length < 15) ||
    (lowerMessage.includes("find") && lowerMessage.length < 15);

  if (isGenericDiscovery) {
    const items = data.opportunities
      .slice(0, 3)
      .map((o) => ({
        id: o.id,
        title: o.title,
        issuer: getBuyerName(data, o.issuingOrganisationId),
        fit: Math.round(
          ((o.assessment?.technicalFit ?? 0) + (o.assessment?.networkStrength ?? 0)) / 2
        ),
      }));

    return {
      blocks: [
        {
          type: "text",
          content: `I found ${items.length} opportunities in your workspace that might be relevant.`,
        },
        {
          type: "opportunities",
          content: "",
          opportunities: items,
        },
        {
          type: "cta",
          content: "You can open an opportunity or break these apart into separate focused chats.",
          ctaText: "Break apart into separate chats",
          ctaAction: "breakapart",
        },
      ],
    };
  }

  const parsed = extractOpportunitySearchQuery(message);
  if (!parsed) {
    return null;
  }
  
  const { query, explicit } = parsed;

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
    if (explicit) {
      return {
        blocks: [
          {
            type: "text",
            content: `I searched your workspace for "**${query}**" but couldn't find any matches. You may need to activate more connector sources or adjust your search.`,
          }
        ]
      };
    }
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

