import type {
  BuyerOrganisation,
  ComplexitySignal,
  ConnectorSource,
  IntelligenceEvent,
  Organisation,
  Person,
  RelationshipSignal,
  TenderBoard,
} from "@/lib/types";
import type { OpportunityWithAssessment } from "./types";

export function mapRowToOpportunity(row: Record<string, unknown>): OpportunityWithAssessment {
  const assessment = (row.opportunity_assessments as Record<string, unknown>[])?.[0];

  return {
    id: row.id as string,
    title: row.title as string,
    issuingOrganisationId: row.issuing_organisation_id as string,
    category: (row.category as string) ?? "Uncategorised",
    dueDate: typeof row.due_date === "string" ? row.due_date : "",
    summary: (row.summary as string) ?? "",
    status: row.status as OpportunityWithAssessment["status"],
    sourceId: typeof row.source_id === "string" ? row.source_id : undefined,
    // Enrichment fields
    noticeId: (row.notice_id as string | null) ?? null,
    sourceUrl: (row.source_url as string | null) ?? null,
    publishedAt: (row.published_at as string | null) ?? null,
    closesAt: (row.closes_at as string | null) ?? null,
    valueMin: (row.value_min as number | null) ?? null,
    valueMax: (row.value_max as number | null) ?? null,
    procurementType: (row.procurement_type as string | null) ?? null,
    feedId: (row.feed_id as string | null) ?? null,
    detailLevel: ((row.detail_level as string) ?? "feed") as "feed" | "opportunity" | "detail",
    contactName: (row.contact_name as string | null) ?? null,
    contactEmail: (row.contact_email as string | null) ?? null,
    assessment: {
      technicalFit: (assessment?.technical_fit as number) ?? 0,
      networkStrength: (assessment?.network_strength as number) ?? 0,
      organisationalComplexity: (assessment?.organisational_complexity as number) ?? 0,
      recommendation:
        (assessment?.recommendation as OpportunityWithAssessment["assessment"]["recommendation"]) ??
        "low-priority",
      strategyPosture:
        (assessment?.strategy_posture as OpportunityWithAssessment["assessment"]["strategyPosture"]) ??
        "monitor-only",
    },
  };
}

export function mapBuyerOrganisationRow(row: Record<string, unknown>): BuyerOrganisation {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | undefined) ?? undefined,
    parentId: (row.parent_id as string | undefined) ?? undefined,
    subsidiaries: (row.subsidiaries as string[]) ?? [],
    acquisitionHistory: (row.acquisition_history as string[]) ?? [],
    boardComplexity: (row.board_complexity as BuyerOrganisation["boardComplexity"]) ?? undefined,
    scale: (row.scale as BuyerOrganisation["scale"]) ?? undefined,
    abn: (row.abn as string | null) ?? null,
    agencyType: (row.agency_type as string | null) ?? null,
  };
}

export function mapPersonRow(row: Record<string, unknown>): Person {
  return {
    id: row.id as string,
    name: row.name as string,
    title: row.title as string,
    organisationId: row.organisation_id as string,
  };
}

export function groupPeopleByOrganisation(rows: Record<string, unknown>[]): Record<string, Person[]> {
  return rows.reduce<Record<string, Person[]>>((acc, row) => {
    const person = mapPersonRow(row);
    if (!acc[person.organisationId]) {
      acc[person.organisationId] = [];
    }
    acc[person.organisationId].push(person);
    return acc;
  }, {});
}

export function mapOrganisationRow(
  row: Record<string, unknown>,
  peopleByOrganisation: Record<string, Person[]>
): Organisation {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    websiteUrl: (row.website_url as string | undefined) ?? undefined,
    linkedinUrl: (row.linkedin_url as string | undefined) ?? undefined,
    logoUrl: (row.logo_url as string | undefined) ?? undefined,
    location: (row.location as string | undefined) ?? undefined,
    socialProfiles: (row.social_profiles as Organisation["socialProfiles"]) ?? [],
    capabilities: (row.capabilities as Organisation["capabilities"]) ?? [],
    sectors: (row.sectors as string[]) ?? [],
    certifications: (row.certifications as Organisation["certifications"]) ?? [],
    individualQualifications:
      (row.individual_qualifications as Organisation["individualQualifications"]) ?? [],
    caseStudies: (row.case_studies as Organisation["caseStudies"]) ?? [],
    personnel: peopleByOrganisation[row.id as string] ?? [],
    strategicPreferences: (row.strategic_preferences as string[]) ?? [],
    targetMarkets: (row.target_markets as string[]) ?? [],
    partnerGaps: (row.partner_gaps as string[]) ?? [],
    // Government procurement intelligence
    unspscCodes: (row.unspsc_codes as Organisation["unspscCodes"]) ?? [],
    anzsicCode: (row.anzsic_code as string | null | undefined) ?? null,
    governmentPanels: (row.government_panels as Organisation["governmentPanels"]) ?? [],
    operatingRegions: (row.operating_regions as string[]) ?? [],
    tenderKeywords: (row.tender_keywords as string[]) ?? [],
  };
}

export function mapRelationshipSignalRow(row: Record<string, unknown>): RelationshipSignal {
  return {
    id: row.id as string,
    bidderPersonId: row.bidder_person_id as string,
    buyerOrganisationId: row.buyer_organisation_id as string,
    connectionCount: (row.connection_count as number) ?? 0,
    seniorityLevel: row.seniority_level as RelationshipSignal["seniorityLevel"],
    sharedEmployers: (row.shared_employers as number) ?? 0,
    adjacencyToDecisionMakers:
      row.adjacency_to_decision_makers as RelationshipSignal["adjacencyToDecisionMakers"],
    departmentConcentration: (row.department_concentration as string[]) ?? [],
  };
}

export function mapComplexitySignalRow(row: Record<string, unknown>): ComplexitySignal {
  return {
    id: row.id as string,
    organisationId: row.organisation_id as string,
    ownershipLayers: (row.ownership_layers as number) ?? 0,
    subsidiaryCount: (row.subsidiary_count as number) ?? 0,
    acquisitionCount: (row.acquisition_count as number) ?? 0,
    boardInfluence: row.board_influence as ComplexitySignal["boardInfluence"],
    procurementComplexity: row.procurement_complexity as ComplexitySignal["procurementComplexity"],
  };
}

export function mapConnectorSourceRow(row: Record<string, unknown>): ConnectorSource {
  const rawConfig = row.config;
  let parsedConfig: Record<string, unknown> | null = null;

  if (rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig)) {
    parsedConfig = rawConfig as Record<string, unknown>;
  } else if (typeof rawConfig === "string" && rawConfig.trim().length > 0) {
    try {
      parsedConfig = JSON.parse(rawConfig) as Record<string, unknown>;
    } catch {
      parsedConfig = null;
    }
  }

  return {
    id: row.id as string,
    name: row.name as string,
    status: row.status as ConnectorSource["status"],
    sourceType: (row.source_type as string) ?? "",
    contribution: (row.contribution as string) ?? "",
    config: parsedConfig,
  };
}

export function mapIntelligenceEventRow(row: Record<string, unknown>): IntelligenceEvent {
  return {
    id: row.id as string,
    type: row.type as IntelligenceEvent["type"],
    timestamp: row.timestamp as string,
    description: row.description as string,
    opportunityId: (row.opportunity_id as string | undefined) ?? undefined,
    organisationId: (row.organisation_id as string | undefined) ?? undefined,
  };
}

export function mapTenderBoardRow(row: Record<string, unknown>): TenderBoard {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    region: (row.region as string | undefined) ?? undefined,
  };
}
