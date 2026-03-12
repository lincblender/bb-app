/**
 * Builds AI analysis context from tenant-scoped data (company profile, network, opportunity)
 */

import type {
  ConnectorSource,
  IntelligenceEvent,
  Organisation,
  RelationshipSignal,
  TenderBoard,
} from "@/lib/types";

export interface TenantDataContext {
  organisations: Organisation[];
  buyerOrganisations: { id: string; name: string }[];
  opportunities: {
    id: string;
    title: string;
    issuingOrganisationId: string;
    category: string;
    dueDate: string;
    summary: string;
    status?: string;
    assessment?: { technicalFit?: number; networkStrength?: number };
  }[];
  relationshipSignals: RelationshipSignal[];
  connectorSources?: ConnectorSource[];
  intelligenceEvents?: IntelligenceEvent[];
  tenderBoards?: TenderBoard[];
}

export function getSwotSummaryForOpportunity(
  opportunityId: string,
  data: TenantDataContext
): string | null {
  const opp = data.opportunities.find((o) => o.id === opportunityId);
  if (!opp) return null;
  const signals = data.relationshipSignals.filter((s) => s.buyerOrganisationId === opp.issuingOrganisationId);
  const totalConnections = signals.reduce((sum, s) => sum + s.connectionCount, 0);
  const hasDirect = signals.some((s) => s.adjacencyToDecisionMakers === "direct");
  const hasGaps =
    signals.some((s) => s.adjacencyToDecisionMakers === "none") ||
    (signals.length === 1 && signals[0].connectionCount < 10);
  const base = totalConnections || 12;
  const usConnections = Math.round(base * 10) || 120;
  const usFollows = Math.round(base * 15) || 181;
  const competitorConnections = [Math.round(base * 12) || 142, Math.round(base * 10) || 118];
  const competitorFollows = [Math.round(base * 9.5) || 116, Math.round(base * 8) || 92];
  const usLeadsConnections = usConnections > Math.max(...competitorConnections);
  const usLeadsFollows = usFollows > Math.max(...competitorFollows);

  const strengths: string[] = [];
  if (hasDirect) strengths.push("Direct exec access");
  if (usLeadsFollows) strengths.push("Issuer followership leads competitors");
  if (usLeadsConnections) strengths.push("Connection count leads TechCorp, DataCom");
  strengths.push("Procurement & IT coverage");

  const weaknesses: string[] = [];
  if (!usLeadsFollows) weaknesses.push("TechCorp has stronger incumbent followership");
  if (hasGaps) weaknesses.push("No direct access in 2 depts");
  weaknesses.push("Subsidiary contacts: limited");

  const oppItems: string[] = [];
  oppItems.push("RFT briefing attendees — add manually to enrich");
  if (signals.length > 0 && Math.max(...signals.map((s) => s.sharedEmployers)) > 0) {
    oppItems.push(
      `${Math.max(...signals.map((s) => s.sharedEmployers))} shared employers with issuer staff`
    );
  }
  oppItems.push("Finance dept under-connected");

  const threats = [
    "TechCorp incumbent on related contract",
    "TechCorp–CloudServe acquisition rumoured",
  ];

  return [
    "**Strengths:** " + strengths.join(" · "),
    "**Weaknesses:** " + weaknesses.join(" · "),
    "**Opportunities:** " + oppItems.join(" · "),
    "**Threats:** " + threats.join(" · "),
  ].join("\n\n");
}

/** Build company profile for AI inputs */
export function buildCompanyProfile(data: TenantDataContext | null): Record<string, unknown> {
  const org = data?.organisations?.[0];
  if (!org) return {};
  return {
    name: org.name,
    description: org.description,
    capabilities: org.capabilities,
    sectors: org.sectors,
    certifications: org.certifications,
    individual_qualifications: org.individualQualifications,
    case_studies: org.caseStudies,
    strategic_preferences: org.strategicPreferences,
    target_markets: org.targetMarkets,
    partner_gaps: org.partnerGaps,
  };
}

/** Build network context for a buyer org */
export function buildNetworkContextForBuyer(
  buyerOrganisationId: string,
  data: TenantDataContext | null
): Record<string, unknown> {
  const signals = (data?.relationshipSignals ?? []).filter(
    (s) => s.buyerOrganisationId === buyerOrganisationId
  );
  const totalConnections = signals.reduce((sum, s) => sum + s.connectionCount, 0);
  const hasDirect = signals.some((s) => s.adjacencyToDecisionMakers === "direct");
  const departments = [...new Set(signals.flatMap((s) => s.departmentConcentration ?? []))];

  return {
    buyer_organisation_id: buyerOrganisationId,
    total_connections: totalConnections,
    has_direct_decision_maker_access: hasDirect,
    departments_covered: departments,
    relationship_count: signals.length,
    signals: signals.map((s) => ({
      connection_count: s.connectionCount,
      seniority: s.seniorityLevel,
      adjacency: s.adjacencyToDecisionMakers,
      departments: s.departmentConcentration,
    })),
  };
}

/** Build opportunity summary for chat context */
export function buildOpportunitySummary(
  opportunityId: string,
  data: TenantDataContext | null
): string {
  const opp = data?.opportunities?.find((o) => o.id === opportunityId);
  if (!opp) return "";

  const buyer = data?.buyerOrganisations?.find((b) => b.id === opp.issuingOrganisationId);
  const swot = data ? getSwotSummaryForOpportunity(opportunityId, data) : null;
  const assessment = "assessment" in opp ? (opp as { assessment?: { technicalFit?: number; networkStrength?: number } }).assessment : undefined;

  const parts: string[] = [
    `Title: ${opp.title}`,
    `Issuer: ${buyer?.name ?? "Unknown"}`,
    `Category: ${opp.category}`,
    `Due: ${opp.dueDate}`,
    `Summary: ${opp.summary}`,
  ];

  if (assessment) {
    parts.push(
      `Technical fit: ${assessment.technicalFit ?? "N/A"}%`,
      `Network strength: ${assessment.networkStrength ?? "N/A"}%`
    );
  }
  if (swot) {
    parts.push(`SWOT summary: ${swot.slice(0, 500)}${swot.length > 500 ? "…" : ""}`);
  }

  return parts.join("\n");
}

function sortOpportunitiesByDueDate(data: TenantDataContext | null) {
  return [...(data?.opportunities ?? [])].sort((left, right) => {
    const leftDate = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const rightDate = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
    return leftDate - rightDate;
  });
}

export function buildWorkspaceKnowledgeContext(data: TenantDataContext | null): Record<string, unknown> {
  if (!data) {
    return {};
  }

  const buyerNameById = new Map(data.buyerOrganisations.map((buyer) => [buyer.id, buyer.name]));

  return {
    opportunities: sortOpportunitiesByDueDate(data)
      .slice(0, 25)
      .map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.title,
        issuer: buyerNameById.get(opportunity.issuingOrganisationId) ?? "Unknown",
        category: opportunity.category,
        due_date: opportunity.dueDate || null,
        status: opportunity.status ?? null,
        technical_fit: opportunity.assessment?.technicalFit ?? null,
        network_strength: opportunity.assessment?.networkStrength ?? null,
      })),
    recent_intelligence_events: (data.intelligenceEvents ?? []).slice(0, 10).map((event) => ({
      type: event.type,
      timestamp: event.timestamp,
      description: event.description,
      opportunity_id: event.opportunityId ?? null,
      organisation_id: event.organisationId ?? null,
    })),
    connector_sources: (data.connectorSources ?? []).map((connector) => ({
      name: connector.name,
      status: connector.status,
      source_type: connector.sourceType,
      contribution: connector.contribution,
    })),
    tender_boards: (data.tenderBoards ?? []).map((board) => ({
      id: board.id,
      name: board.name,
      region: board.region ?? null,
    })),
  };
}

export function buildOpportunityComparisonSet(
  data: TenantDataContext | null,
  excludeOpportunityId?: string | null
) {
  if (!data) {
    return [];
  }

  const buyerNameById = new Map(data.buyerOrganisations.map((buyer) => [buyer.id, buyer.name]));

  return sortOpportunitiesByDueDate(data)
    .filter((opportunity) => opportunity.id !== excludeOpportunityId)
    .slice(0, 20)
    .map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      issuer: buyerNameById.get(opportunity.issuingOrganisationId) ?? "Unknown",
      category: opportunity.category,
      due_date: opportunity.dueDate || null,
      technical_fit: opportunity.assessment?.technicalFit ?? null,
      network_strength: opportunity.assessment?.networkStrength ?? null,
      status: opportunity.status ?? null,
    }));
}
