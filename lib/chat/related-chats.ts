import type { Chat } from "./types";

export interface RelatedChat {
  chat: Chat;
  relation: "primary" | "secondary" | "tertiary";
  reason: string;
}

interface OpportunityRef {
  id: string;
  issuingOrganisationId: string;
  category: string;
}

/**
 * Primary: chats about this exact opportunity
 * Secondary: same company (buyer), different need
 * Tertiary: same need (category), different client
 */
export function getRelatedChats(
  opportunityId: string,
  allChats: Chat[],
  currentChatId: string | null,
  opportunities: OpportunityRef[],
  getBuyerName: (id: string) => string
): RelatedChat[] {
  const opp = opportunities.find((o) => o.id === opportunityId);
  if (!opp) return [];

  const buyerId = opp.issuingOrganisationId;
  const category = opp.category;

  const result: RelatedChat[] = [];

  for (const chat of allChats) {
    if (chat.id === currentChatId) continue;

    const oppIds = chat.tags
      .filter((t) => t.type === "opportunity" && t.opportunityId)
      .map((t) => t.opportunityId!);

    if (oppIds.includes(opportunityId)) {
      result.push({
        chat,
        relation: "primary",
        reason: "This bid/opportunity",
      });
      continue;
    }

    const otherOpps = opportunities.filter((o) => oppIds.includes(o.id));
    const sameBuyer = otherOpps.some((o) => o.issuingOrganisationId === buyerId);
    const sameCategory = otherOpps.some((o) => o.category === category);

    if (sameBuyer && !oppIds.includes(opportunityId)) {
      result.push({
        chat,
        relation: "secondary",
        reason: `Same company (${getBuyerName(buyerId)}), different need`,
      });
    } else if (sameCategory && !oppIds.includes(opportunityId)) {
      result.push({
        chat,
        relation: "tertiary",
        reason: `Same need (${category}), different client`,
      });
    }
  }

  return result.slice(0, 10);
}
