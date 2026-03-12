"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { TenantDataContext } from "@/lib/ai/build-context";
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
import type { WorkspaceData } from "./types";

const WorkspaceDataContext = createContext<WorkspaceData | null>(null);

export function WorkspaceDataProvider({ children }: { children: ReactNode }) {
  const [opportunities, setOpportunities] = useState<WorkspaceData["opportunities"]>([]);
  const [buyerOrganisations, setBuyerOrganisations] = useState<WorkspaceData["buyerOrganisations"]>([]);
  const [organisations, setOrganisations] = useState<WorkspaceData["organisations"]>([]);
  const [relationshipSignals, setRelationshipSignals] =
    useState<WorkspaceData["relationshipSignals"]>([]);
  const [complexitySignals, setComplexitySignals] =
    useState<WorkspaceData["complexitySignals"]>([]);
  const [connectorSources, setConnectorSources] =
    useState<WorkspaceData["connectorSources"]>([]);
  const [intelligenceEvents, setIntelligenceEvents] =
    useState<WorkspaceData["intelligenceEvents"]>([]);
  const [tenderBoards, setTenderBoards] = useState<WorkspaceData["tenderBoards"]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setOpportunities([]);
      setBuyerOrganisations([]);
      setOrganisations([]);
      setRelationshipSignals([]);
      setComplexitySignals([]);
      setConnectorSources([]);
      setIntelligenceEvents([]);
      setTenderBoards([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
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

      setOpportunities(
        ((opportunityRes.data ?? []) as Record<string, unknown>[]).map(mapRowToOpportunity)
      );
      setBuyerOrganisations(
        ((buyerRes.data ?? []) as Record<string, unknown>[]).map(mapBuyerOrganisationRow)
      );
      setOrganisations(
        ((bidderRes.data ?? []) as Record<string, unknown>[]).map((row) =>
          mapOrganisationRow(row, peopleByOrganisation)
        )
      );
      setRelationshipSignals(
        ((relationshipRes.data ?? []) as Record<string, unknown>[]).map(mapRelationshipSignalRow)
      );
      setComplexitySignals(
        ((complexityRes.data ?? []) as Record<string, unknown>[]).map(mapComplexitySignalRow)
      );
      setConnectorSources(
        ((connectorRes.data ?? []) as Record<string, unknown>[]).map(mapConnectorSourceRow)
      );
      setIntelligenceEvents(
        ((eventRes.data ?? []) as Record<string, unknown>[]).map(mapIntelligenceEventRow)
      );
      setTenderBoards(
        ((tenderBoardRes.data ?? []) as Record<string, unknown>[]).map(mapTenderBoardRow)
      );
    } catch (error) {
      console.error("Failed to load workspace data", error);
      setOpportunities([]);
      setBuyerOrganisations([]);
      setOrganisations([]);
      setRelationshipSignals([]);
      setComplexitySignals([]);
      setConnectorSources([]);
      setIntelligenceEvents([]);
      setTenderBoards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const value: WorkspaceData = {
    opportunities,
    buyerOrganisations,
    organisations,
    relationshipSignals,
    complexitySignals,
    connectorSources,
    intelligenceEvents,
    tenderBoards,
    loading,
    refetch: fetchData,
  };

  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}

export function useWorkspaceData() {
  const context = useContext(WorkspaceDataContext);
  if (!context) {
    throw new Error("useWorkspaceData must be used within WorkspaceDataProvider");
  }
  return context;
}

export function useWorkspaceDataOptional() {
  return useContext(WorkspaceDataContext);
}

export function useTenantDataContext(): TenantDataContext | null {
  const context = useContext(WorkspaceDataContext);

  if (!context) {
    return null;
  }

  return {
    organisations: context.organisations,
    buyerOrganisations: context.buyerOrganisations.map((buyer) => ({
      id: buyer.id,
      name: buyer.name,
    })),
    opportunities: context.opportunities,
    relationshipSignals: context.relationshipSignals,
    connectorSources: context.connectorSources,
    intelligenceEvents: context.intelligenceEvents,
    tenderBoards: context.tenderBoards,
  };
}
