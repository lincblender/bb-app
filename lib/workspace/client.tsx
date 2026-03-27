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
      const res = await fetch("/api/workspace");
      if (!res.ok) throw new Error("Failed to fetch workspace data");
      const data = await res.json();

      // Trigger bidirectional background sync on app load 
      // Fire and forget to avoid delaying render
      fetch("/api/sync", { method: "POST" }).catch((err) =>
        console.warn("Background sync failed", err)
      );

      setOpportunities(data.opportunities ?? []);
      setBuyerOrganisations(data.buyerOrganisations ?? []);
      setOrganisations(data.organisations ?? []);
      setRelationshipSignals(data.relationshipSignals ?? []);
      setComplexitySignals(data.complexitySignals ?? []);
      setConnectorSources(data.connectorSources ?? []);
      setIntelligenceEvents(data.intelligenceEvents ?? []);
      setTenderBoards(data.tenderBoards ?? []);
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
