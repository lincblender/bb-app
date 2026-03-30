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
  /** Australian Business Number (11 digits, no spaces). */
  abn?: string | null;
  /** e.g. "Commonwealth Entity", "State Entity", "Statutory Authority". */
  agencyType?: string | null;
}

/**
 * How much data has been gathered for this opportunity.
 *   feed        → RSS/Atom item only (title, link, summary, pubDate)
 *   opportunity → Notice page front matter (close date, value, contact, addenda list)
 *   detail      → All documents pulled and stored
 */
export type OpportunityDetailLevel = "feed" | "opportunity" | "detail";

export interface Opportunity {
  id: string;
  title: string;
  issuingOrganisationId: string;
  category: string;
  /** Legacy alias for closesAt (DATE string). Kept for backward compat. */
  dueDate: string;
  summary: string;
  status: "new" | "reviewing" | "pursuing" | "monitoring" | "passed";
  /** tender_boards.id of the feed this came from. */
  sourceId?: string;
  // ── Enriched fields (populated at opportunity or detail level) ──────────
  /** Source system's own notice reference (e.g. "FINANCE-123456"). */
  noticeId?: string | null;
  /** Direct URL to the notice on the source portal. */
  sourceUrl?: string | null;
  /** When the notice was published (ISO string). */
  publishedAt?: string | null;
  /** Close date with time (ISO string — more precise than dueDate). */
  closesAt?: string | null;
  /** Estimated minimum value in AUD (integer dollars). */
  valueMin?: number | null;
  /** Estimated maximum value in AUD (integer dollars). */
  valueMax?: number | null;
  /** e.g. "ATM", "RFT", "RFQ", "EOI", "CN". */
  procurementType?: string | null;
  /** feed-registry.ts feed ID (e.g. "austender-cth"). */
  feedId?: string | null;
  detailLevel?: OpportunityDetailLevel;
  contactName?: string | null;
  contactEmail?: string | null;
  /** Arbitrary extra data from the source. */
  rawMetadata?: Record<string, unknown> | null;
}

export interface OpportunityAddendum {
  id: string;
  opportunityId: string;
  addendumNumber: number | null;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
}

export interface OpportunityDocument {
  id: string;
  opportunityId: string;
  title: string;
  sourceUrl: string | null;
  fileType: string | null;
  storagePath: string | null;
  content: string | null;
  sizeBytes: number | null;
  fetchedAt: string | null;
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
