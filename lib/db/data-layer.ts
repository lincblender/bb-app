import { createClient } from "@/lib/supabase/server";
import {
  getOpportunities,
  getBuyerOrganisations,
  getOrganisations,
  getRelationshipSignals,
  getComplexitySignals,
  getConnectorSources,
  getIntelligenceEvents,
  getTenderBoards,
  upsertOpportunity as sqliteUpsertOpportunity,
  upsertOrganisation as sqliteUpsertOrganisation,
} from "./repositories";
import {
  groupPeopleByOrganisation,
  mapBuyerOrganisationRow,
  mapComplexitySignalRow,
  mapConnectorSourceRow,
  mapIntelligenceEventRow,
  mapOrganisationRow,
  mapRelationshipSignalRow,
  mapRowToOpportunity,
  mapTenderBoardRow,
} from "@/lib/workspace/records";
import type { Opportunity, Organisation, BuyerOrganisation, FitAssessment } from "@/lib/types";

async function fetchFromSupabase() {
  const supabase = await createClient();
  const [opportunityRes, buyerRes, bidderRes, peopleRes, relationshipRes, complexityRes, connectorRes, eventRes, tenderBoardRes] =
    await Promise.all([
      supabase
        .from("opportunities")
        .select("*, opportunity_assessments(*)")
        .order("due_date", { ascending: true }),
      supabase.from("organisations").select("*").eq("type", "buyer"),
      supabase.from("organisations").select("*").eq("type", "bidder"),
      supabase.from("people").select("*"),
      supabase.from("relationship_signals").select("*"),
      supabase.from("complexity_signals").select("*"),
      supabase.from("connector_sources").select("*"),
      supabase
        .from("intelligence_events")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50),
      supabase.from("tender_boards").select("*").order("name", { ascending: true }),
    ]);

  if (
    opportunityRes.error ||
    buyerRes.error ||
    bidderRes.error ||
    peopleRes.error ||
    relationshipRes.error ||
    complexityRes.error ||
    connectorRes.error ||
    eventRes.error ||
    tenderBoardRes.error
  ) {
    throw new Error("Supabase fetch failed");
  }

  const peopleByOrganisation = groupPeopleByOrganisation(
    (peopleRes.data ?? []) as Record<string, unknown>[]
  );

  return {
    opportunities: ((opportunityRes.data ?? []) as Record<string, unknown>[]).map(mapRowToOpportunity),
    buyerOrganisations: ((buyerRes.data ?? []) as Record<string, unknown>[]).map(mapBuyerOrganisationRow),
    organisations: ((bidderRes.data ?? []) as Record<string, unknown>[]).map((row) =>
      mapOrganisationRow(row, peopleByOrganisation)
    ),
    relationshipSignals: ((relationshipRes.data ?? []) as Record<string, unknown>[]).map(
      mapRelationshipSignalRow
    ),
    complexitySignals: ((complexityRes.data ?? []) as Record<string, unknown>[]).map(
      mapComplexitySignalRow
    ),
    connectorSources: ((connectorRes.data ?? []) as Record<string, unknown>[]).map(
      mapConnectorSourceRow
    ),
    intelligenceEvents: ((eventRes.data ?? []) as Record<string, unknown>[]).map(
      mapIntelligenceEventRow
    ),
    tenderBoards: ((tenderBoardRes.data ?? []) as Record<string, unknown>[]).map(
      mapTenderBoardRow
    ),
  };
}

function fetchFromSQLite(tenantId: string) {
  return {
    opportunities: getOpportunities(tenantId),
    buyerOrganisations: getBuyerOrganisations(tenantId),
    organisations: getOrganisations(tenantId),
    relationshipSignals: getRelationshipSignals(tenantId),
    complexitySignals: getComplexitySignals(tenantId),
    connectorSources: getConnectorSources(tenantId),
    intelligenceEvents: getIntelligenceEvents(tenantId),
    tenderBoards: getTenderBoards(tenantId),
  };
}

export async function fetchWorkspaceData(tenantId: string) {
  if (process.env.USE_SQLITE === "true") {
    return fetchFromSQLite(tenantId);
  }

  try {
    // Phase 2: Read fallback - Try Supabase first
    return await fetchFromSupabase();
  } catch (err) {
    console.error("Supabase read failed, falling back to SQLite", err);
    // On failure, fall back to SQLite
    return fetchFromSQLite(tenantId);
  }
}

export async function writeOpportunity(opportunity: Opportunity & { assessment?: FitAssessment }, tenantId: string) {
  let supabaseSuccess = false;

  if (process.env.USE_SQLITE !== "true") {
    try {
      const supabase = await createClient();
      const oppPayload = {
        id: opportunity.id,
        tenant_id: tenantId,
        issuing_organisation_id: opportunity.issuingOrganisationId,
        title: opportunity.title,
        category: opportunity.category,
        due_date: opportunity.dueDate || null,
        summary: opportunity.summary,
        status: opportunity.status || "reviewing",
        source_id: opportunity.sourceId || null,
        updated_at: new Date().toISOString(),
      };

      const { error: oppError } = await supabase.from("opportunities").upsert(oppPayload);
      if (oppError) throw oppError;

      if (opportunity.assessment) {
        const assessmentPayload = {
          opportunity_id: opportunity.id,
          technical_fit: opportunity.assessment.technicalFit ?? 0,
          network_strength: opportunity.assessment.networkStrength ?? 0,
          organisational_complexity: opportunity.assessment.organisationalComplexity ?? 0,
          recommendation: opportunity.assessment.recommendation ?? "low-priority",
          strategy_posture: opportunity.assessment.strategyPosture ?? "monitor-only",
          updated_at: new Date().toISOString(),
        };

        const { error: assessmentError } = await supabase
          .from("opportunity_assessments")
          .upsert(assessmentPayload);
        if (assessmentError) throw assessmentError;
      }
      supabaseSuccess = true;
    } catch (err) {
      console.error("Supabase write opportunity failed", err);
    }
  }

  // Dual-write: Always write to SQLite as well (if dual-configured or offline fallback)
  // If USE_SQLITE is true, Supabase is skipped, and it just writes to SQLite.
  try {
    sqliteUpsertOpportunity(opportunity, tenantId);
  } catch (err) {
    console.error("SQLite write opportunity failed", err);
    // If Supabase also failed (or was skipped), we have a total failure
    if (!supabaseSuccess && process.env.USE_SQLITE !== "true") {
      throw err;
    }
  }
}

export async function writeOrganisation(org: Organisation | BuyerOrganisation, tenantId: string) {
  let supabaseSuccess = false;

  if (process.env.USE_SQLITE !== "true") {
    try {
      const supabase = await createClient();
      const type = "capabilities" in org ? "bidder" : "buyer";
      
      const payload: Record<string, unknown> = {
        id: org.id,
        tenant_id: tenantId,
        type: type,
        name: org.name,
        description: org.description || "",
        updated_at: new Date().toISOString(),
      };

      if (type === "bidder") {
        const bidder = org as Organisation;
        payload.website_url = bidder.websiteUrl || null;
        payload.linkedin_url = bidder.linkedinUrl || null;
        payload.logo_url = bidder.logoUrl || null;
        payload.location = bidder.location || null;
        payload.social_profiles = JSON.stringify(bidder.socialProfiles || []);
        payload.capabilities = JSON.stringify(bidder.capabilities || []);
        payload.sectors = JSON.stringify(bidder.sectors || []);
        payload.certifications = JSON.stringify(bidder.certifications || []);
        payload.individual_qualifications = JSON.stringify(bidder.individualQualifications || []);
        payload.case_studies = JSON.stringify(bidder.caseStudies || []);
        payload.strategic_preferences = JSON.stringify(bidder.strategicPreferences || []);
        payload.target_markets = JSON.stringify(bidder.targetMarkets || []);
        payload.partner_gaps = JSON.stringify(bidder.partnerGaps || []);
      } else {
        const buyer = org as BuyerOrganisation;
        payload.parent_id = buyer.parentId || null;
        payload.subsidiaries = JSON.stringify(buyer.subsidiaries || []);
        payload.acquisition_history = JSON.stringify(buyer.acquisitionHistory || []);
        payload.board_complexity = buyer.boardComplexity || null;
        payload.scale = buyer.scale || null;
      }

      const { error } = await supabase.from("organisations").upsert(payload);
      if (error) throw error;
      
      supabaseSuccess = true;
    } catch (err) {
      console.error("Supabase write organisation failed", err);
    }
  }

  try {
    sqliteUpsertOrganisation(org, tenantId);
  } catch (err) {
    console.error("SQLite write organisation failed", err);
    if (!supabaseSuccess && process.env.USE_SQLITE !== "true") {
      throw err;
    }
  }
}

export async function writeOpportunities(opportunities: (Opportunity & { assessment?: FitAssessment })[], tenantId: string) {
  if (opportunities.length === 0) return;

  let supabaseSuccess = false;
  if (process.env.USE_SQLITE !== "true") {
    try {
      const supabase = await createClient();
      const oppPayloads = opportunities.map(opp => ({
        id: opp.id,
        tenant_id: tenantId,
        issuing_organisation_id: opp.issuingOrganisationId,
        title: opp.title,
        category: opp.category,
        due_date: opp.dueDate || null,
        summary: opp.summary,
        status: opp.status || "reviewing",
        source_id: opp.sourceId || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: oppError } = await supabase.from("opportunities").upsert(oppPayloads, { onConflict: "id" });
      if (oppError) throw oppError;

      const assessmentPayloads = opportunities
        .filter(opp => opp.assessment)
        .map(opp => ({
          opportunity_id: opp.id,
          technical_fit: opp.assessment!.technicalFit ?? 0,
          network_strength: opp.assessment!.networkStrength ?? 0,
          organisational_complexity: opp.assessment!.organisationalComplexity ?? 0,
          recommendation: opp.assessment!.recommendation ?? "low-priority",
          strategy_posture: opp.assessment!.strategyPosture ?? "monitor-only",
          updated_at: new Date().toISOString(),
        }));

      if (assessmentPayloads.length > 0) {
        const { error: assessmentError } = await supabase
          .from("opportunity_assessments")
          .upsert(assessmentPayloads, { onConflict: "opportunity_id" });
        if (assessmentError) throw assessmentError;
      }
      supabaseSuccess = true;
    } catch (err) {
      console.error("Supabase bulk write opportunities failed", err);
    }
  }

  try {
    for (const opp of opportunities) {
      sqliteUpsertOpportunity(opp, tenantId);
    }
  } catch (err) {
    console.error("SQLite bulk write opportunities failed", err);
    if (!supabaseSuccess && process.env.USE_SQLITE !== "true") {
      throw err;
    }
  }
}

export async function writeOrganisations(orgs: (Organisation | BuyerOrganisation)[], tenantId: string) {
  if (orgs.length === 0) return;
  
  let supabaseSuccess = false;
  if (process.env.USE_SQLITE !== "true") {
    try {
      const supabase = await createClient();
      const payloads = orgs.map(org => {
        const type = "capabilities" in org ? "bidder" : "buyer";
        const base: Record<string, unknown> = {
          id: org.id,
          tenant_id: tenantId,
          type: type,
          name: org.name,
          description: org.description || "",
          updated_at: new Date().toISOString(),
        };

        if (type === "bidder") {
          const bidder = org as Organisation;
          base.website_url = bidder.websiteUrl || null;
          base.linkedin_url = bidder.linkedinUrl || null;
          base.logo_url = bidder.logoUrl || null;
          base.location = bidder.location || null;
          base.social_profiles = JSON.stringify(bidder.socialProfiles || []);
          base.capabilities = JSON.stringify(bidder.capabilities || []);
          base.sectors = JSON.stringify(bidder.sectors || []);
          base.certifications = JSON.stringify(bidder.certifications || []);
          base.individual_qualifications = JSON.stringify(bidder.individualQualifications || []);
          base.case_studies = JSON.stringify(bidder.caseStudies || []);
          base.strategic_preferences = JSON.stringify(bidder.strategicPreferences || []);
          base.target_markets = JSON.stringify(bidder.targetMarkets || []);
          base.partner_gaps = JSON.stringify(bidder.partnerGaps || []);
        } else {
          const buyer = org as BuyerOrganisation;
          base.parent_id = buyer.parentId || null;
          base.subsidiaries = JSON.stringify(buyer.subsidiaries || []);
          base.acquisition_history = JSON.stringify(buyer.acquisitionHistory || []);
          base.board_complexity = buyer.boardComplexity || null;
          base.scale = buyer.scale || null;
        }
        return base;
      });

      const { error } = await supabase.from("organisations").upsert(payloads, { onConflict: "id" });
      if (error) throw error;
      
      supabaseSuccess = true;
    } catch (err) {
      console.error("Supabase bulk write organisations failed", err);
    }
  }

  try {
    for (const org of orgs) {
      sqliteUpsertOrganisation(org, tenantId);
    }
  } catch (err) {
    console.error("SQLite bulk write organisations failed", err);
    if (!supabaseSuccess && process.env.USE_SQLITE !== "true") {
      throw err;
    }
  }
}
