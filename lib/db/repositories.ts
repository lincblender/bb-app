/**
 * Data access layer for SQLite.
 * Returns typed entities; use from API routes or server components.
 */

import { getSqliteDb, generateId } from "./sqlite";
import type {
  Organisation,
  BuyerOrganisation,
  Opportunity,
  Person,
  RelationshipSignal,
  ComplexitySignal,
  ConnectorSource,
  IntelligenceEvent,
  FitAssessment,
} from "@/lib/types";

/** Fallback tenant identifier for local SQLite usage. */
export const DEFAULT_TENANT = "default";

function ensureTenant(db: ReturnType<typeof getSqliteDb>) {
  const row = db.prepare("SELECT id FROM tenants WHERE id = ?").get(DEFAULT_TENANT);
  if (!row) {
    db.prepare(
      "INSERT INTO tenants (id, name) VALUES (?, ?)"
    ).run(DEFAULT_TENANT, "Default");
  }
}

/** Parse JSON column safely */
function parseJson<T>(val: string | null): T {
  if (!val) return [] as unknown as T;
  try {
    return JSON.parse(val) as T;
  } catch {
    return [] as unknown as T;
  }
}

export function getOpportunities(tenantId = DEFAULT_TENANT): (Opportunity & { assessment: FitAssessment })[] {
  const db = getSqliteDb();
  ensureTenant(db);
  const rows = db.prepare(`
    SELECT o.*, 
      oa.technical_fit, oa.network_strength, oa.organisational_complexity,
      oa.recommendation, oa.strategy_posture
    FROM opportunities o
    LEFT JOIN opportunity_assessments oa ON o.id = oa.opportunity_id
    WHERE o.tenant_id = ?
    ORDER BY o.due_date ASC
  `).all(tenantId) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    issuingOrganisationId: r.issuing_organisation_id as string,
    category: r.category as string,
    dueDate: r.due_date as string,
    summary: (r.summary as string) ?? "",
    status: r.status as Opportunity["status"],
    sourceId: r.source_id as string | undefined,
    assessment: {
      technicalFit: (r.technical_fit as number) ?? 0,
      networkStrength: (r.network_strength as number) ?? 0,
      organisationalComplexity: (r.organisational_complexity as number) ?? 0,
      recommendation: (r.recommendation as FitAssessment["recommendation"]) ?? "low-priority",
      strategyPosture: (r.strategy_posture as FitAssessment["strategyPosture"]) ?? "monitor-only",
    },
  }));
}

export function getOpportunityById(id: string): (Opportunity & { assessment: FitAssessment }) | null {
  const db = getSqliteDb();
  const row = db.prepare(`
    SELECT o.*, 
      oa.technical_fit, oa.network_strength, oa.organisational_complexity,
      oa.recommendation, oa.strategy_posture
    FROM opportunities o
    LEFT JOIN opportunity_assessments oa ON o.id = oa.opportunity_id
    WHERE o.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    title: row.title as string,
    issuingOrganisationId: row.issuing_organisation_id as string,
    category: row.category as string,
    dueDate: row.due_date as string,
    summary: (row.summary as string) ?? "",
    status: row.status as Opportunity["status"],
    sourceId: row.source_id as string | undefined,
    assessment: {
      technicalFit: (row.technical_fit as number) ?? 0,
      networkStrength: (row.network_strength as number) ?? 0,
      organisationalComplexity: (row.organisational_complexity as number) ?? 0,
      recommendation: (row.recommendation as FitAssessment["recommendation"]) ?? "low-priority",
      strategyPosture: (row.strategy_posture as FitAssessment["strategyPosture"]) ?? "monitor-only",
    },
  };
}

export function getOrganisations(tenantId = DEFAULT_TENANT): Organisation[] {
  const db = getSqliteDb();
  const rows = db.prepare(
    "SELECT * FROM organisations WHERE tenant_id = ? AND type = 'bidder'"
  ).all(tenantId) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const org = mapOrgToOrganisation(r);
    org.personnel = getPeople(r.id as string);
    return org;
  });
}

export function getBuyerOrganisations(tenantId = DEFAULT_TENANT): BuyerOrganisation[] {
  const db = getSqliteDb();
  const rows = db.prepare(
    "SELECT * FROM organisations WHERE tenant_id = ? AND type = 'buyer'"
  ).all(tenantId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: r.description as string | undefined,
    parentId: r.parent_id as string | undefined,
    subsidiaries: parseJson<string[]>(r.subsidiaries as string),
    acquisitionHistory: parseJson<string[]>(r.acquisition_history as string),
    boardComplexity: r.board_complexity as BuyerOrganisation["boardComplexity"],
    scale: r.scale as BuyerOrganisation["scale"],
  }));
}

export function getOrganisationById(id: string): Organisation | BuyerOrganisation | null {
  const db = getSqliteDb();
  const row = db.prepare("SELECT * FROM organisations WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  if (row.type === "bidder") {
    const org = mapOrgToOrganisation(row);
    org.personnel = getPeople(id);
    return org;
  }
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    parentId: row.parent_id as string | undefined,
    subsidiaries: parseJson<string[]>(row.subsidiaries as string),
    acquisitionHistory: parseJson<string[]>(row.acquisition_history as string),
    boardComplexity: row.board_complexity as BuyerOrganisation["boardComplexity"],
    scale: row.scale as BuyerOrganisation["scale"],
  };
}

function mapOrgToOrganisation(r: Record<string, unknown>): Organisation {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? "",
    websiteUrl: (r.website_url as string | undefined) ?? undefined,
    linkedinUrl: (r.linkedin_url as string | undefined) ?? undefined,
    logoUrl: (r.logo_url as string | undefined) ?? undefined,
    location: (r.location as string | undefined) ?? undefined,
    socialProfiles: parseJson(r.social_profiles as string),
    capabilities: parseJson(r.capabilities as string),
    sectors: parseJson(r.sectors as string),
    certifications: parseJson(r.certifications as string),
    individualQualifications: parseJson(
      (r.individual_qualifications as string) ?? "[]"
    ),
    caseStudies: parseJson(r.case_studies as string),
    personnel: [], // Loaded separately
    strategicPreferences: parseJson(r.strategic_preferences as string),
    targetMarkets: parseJson(r.target_markets as string),
    partnerGaps: parseJson(r.partner_gaps as string),
  };
}

export function getPeople(organisationId: string): Person[] {
  const db = getSqliteDb();
  const rows = db.prepare("SELECT * FROM people WHERE organisation_id = ?").all(organisationId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    title: r.title as string,
    organisationId: r.organisation_id as string,
  }));
}

export function getRelationshipSignals(tenantId = DEFAULT_TENANT): RelationshipSignal[] {
  const db = getSqliteDb();
  const rows = db.prepare(
    "SELECT * FROM relationship_signals WHERE tenant_id = ?"
  ).all(tenantId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    bidderPersonId: r.bidder_person_id as string,
    buyerOrganisationId: r.buyer_organisation_id as string,
    connectionCount: r.connection_count as number,
    seniorityLevel: r.seniority_level as RelationshipSignal["seniorityLevel"],
    sharedEmployers: r.shared_employers as number,
    adjacencyToDecisionMakers: r.adjacency_to_decision_makers as RelationshipSignal["adjacencyToDecisionMakers"],
    departmentConcentration: parseJson(r.department_concentration as string),
  }));
}

export function getComplexitySignals(tenantId = DEFAULT_TENANT): ComplexitySignal[] {
  const db = getSqliteDb();
  const rows = db.prepare(
    "SELECT * FROM complexity_signals WHERE tenant_id = ?"
  ).all(tenantId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    organisationId: r.organisation_id as string,
    ownershipLayers: r.ownership_layers as number,
    subsidiaryCount: r.subsidiary_count as number,
    acquisitionCount: r.acquisition_count as number,
    boardInfluence: r.board_influence as ComplexitySignal["boardInfluence"],
    procurementComplexity: r.procurement_complexity as ComplexitySignal["procurementComplexity"],
  }));
}

export function getConnectorSources(tenantId = DEFAULT_TENANT): ConnectorSource[] {
  const db = getSqliteDb();
  const rows = db.prepare(
    "SELECT * FROM connector_sources WHERE tenant_id = ?"
  ).all(tenantId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    status: r.status as ConnectorSource["status"],
    sourceType: r.source_type as string,
    contribution: (r.contribution as string) ?? "",
  }));
}

export function getIntelligenceEvents(tenantId = DEFAULT_TENANT): IntelligenceEvent[] {
  const db = getSqliteDb();
  const rows = db.prepare(
    "SELECT * FROM intelligence_events WHERE tenant_id = ? ORDER BY timestamp DESC LIMIT 50"
  ).all(tenantId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    type: r.type as IntelligenceEvent["type"],
    timestamp: r.timestamp as string,
    description: r.description as string,
    opportunityId: r.opportunity_id as string | undefined,
    organisationId: r.organisation_id as string | undefined,
  }));
}
