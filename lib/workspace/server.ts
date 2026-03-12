import { createClient } from "@/lib/supabase/server";
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
} from "./records";

export async function fetchCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (typeof profile?.tenant_id === "string" && profile.tenant_id.length > 0) {
    return profile.tenant_id;
  }

  return `user-${user.id}`;
}

export async function fetchWorkspaceData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

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
