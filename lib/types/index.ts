export interface Organisation {
  id: string;
  name: string;
  description: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  logoUrl?: string;
  location?: string;
  socialProfiles?: SocialProfile[];
  capabilities: Capability[];
  sectors: string[];
  certifications: OrgCertification[];
  individualQualifications: IndividualQualification[];
  caseStudies: CaseStudy[];
  personnel: Person[];
  strategicPreferences: string[];
  targetMarkets: string[];
  partnerGaps: string[];
}

export interface Capability {
  id: string;
  name: string;
  category: string;
}

/** Organisation-level certification (ISO, IRAP, FedRAMP, etc.) */
export interface OrgCertification {
  id: string;
  name: string;
  issuer: string;
}

/** @deprecated Use OrgCertification */
export type Certification = OrgCertification;

/** Individual qualification (AWS cert, degree, etc.) with holder count and optional names */
export interface IndividualQualification {
  id: string;
  name: string;
  issuer: string;
  count: number;
  holderNames?: string[];
}

export interface CaseStudy {
  id: string;
  title: string;
  client: string;
  outcome: string;
}

export interface SocialProfile {
  id: string;
  platform:
    | "linkedin"
    | "youtube"
    | "instagram"
    | "facebook"
    | "x"
    | "tiktok"
    | "google_business"
    | "github"
    | "threads"
    | "pinterest"
    | "crunchbase";
  url: string;
  handle: string;
  follows?: number | null;
  followers?: number | null;
  lastPostDate?: string;
}

export interface Person {
  id: string;
  name: string;
  title: string;
  organisationId: string;
}

export interface BuyerOrganisation {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  subsidiaries?: string[];
  acquisitionHistory?: string[];
  boardComplexity?: "low" | "medium" | "high";
  scale?: "small" | "medium" | "large" | "enterprise";
}

export interface Opportunity {
  id: string;
  title: string;
  issuingOrganisationId: string;
  category: string;
  dueDate: string;
  summary: string;
  status: "new" | "reviewing" | "pursuing" | "monitoring" | "passed";
  sourceId?: string;
}

export interface TenderBoard {
  id: string;
  name: string;
  description: string;
  region?: string;
}

export interface RelationshipSignal {
  id: string;
  bidderPersonId: string;
  buyerOrganisationId: string;
  connectionCount: number;
  seniorityLevel: "junior" | "mid" | "senior" | "executive";
  sharedEmployers: number;
  adjacencyToDecisionMakers: "none" | "indirect" | "direct";
  departmentConcentration: string[];
}

export interface ComplexitySignal {
  id: string;
  organisationId: string;
  ownershipLayers: number;
  subsidiaryCount: number;
  acquisitionCount: number;
  boardInfluence: "low" | "medium" | "high";
  procurementComplexity: "low" | "medium" | "high";
}

export interface FitAssessment {
  technicalFit: number;
  networkStrength: number;
  organisationalComplexity: number;
  recommendation: RecommendationBand;
  strategyPosture: StrategyPosture;
}

export type RecommendationBand = "sweet-spot" | "technical-edge" | "relationship-edge" | "low-priority";

export type StrategyPosture =
  | "pursue-directly"
  | "pursue-with-partner"
  | "relationship-led-play"
  | "technically-strong-needs-access"
  | "network-strong-capability-gap"
  | "monitor-only";

export interface ConnectorSource {
  id: string;
  name: string;
  status: "live" | "mock" | "manual" | "disconnected";
  sourceType: string;
  contribution: string;
  config?: Record<string, unknown> | null;
}

export interface IntelligenceEvent {
  id: string;
  type:
    | "opportunity_scanned"
    | "score_updated"
    | "relationship_detected"
    | "complexity_updated"
    | "connector_synced"
    | "history_synced"
    | "opportunity_imported";
  timestamp: string;
  description: string;
  opportunityId?: string;
  organisationId?: string;
}
