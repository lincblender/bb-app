import type {
  BuyerOrganisation,
  ComplexitySignal,
  ConnectorSource,
  FitAssessment,
  IntelligenceEvent,
  Opportunity,
  Organisation,
  RelationshipSignal,
  TenderBoard,
} from "@/lib/types";

export type OpportunityWithAssessment = Opportunity & { assessment: FitAssessment };

export interface WorkspaceDataSnapshot {
  opportunities: OpportunityWithAssessment[];
  buyerOrganisations: BuyerOrganisation[];
  organisations: Organisation[];
  relationshipSignals: RelationshipSignal[];
  complexitySignals: ComplexitySignal[];
  connectorSources: ConnectorSource[];
  intelligenceEvents: IntelligenceEvent[];
  tenderBoards: TenderBoard[];
}

export interface WorkspaceData extends WorkspaceDataSnapshot {
  loading: boolean;
  refetch: () => Promise<void>;
}
