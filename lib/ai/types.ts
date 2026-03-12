/**
 * BidBlender AI Analysis Types
 * Aligned with docs/AI_RESPONSE_SCHEMA.json and docs/AI.md
 */

/** Analysis type enum - maps to paradigm */
export type AnalysisType =
  | "EXTRACT_METADATA"
  | "EXTRACT_PROCUREMENT_STRUCTURE"
  | "EXTRACT_SCOPE"
  | "EXTRACT_EVALUATION_CRITERIA"
  | "EXTRACT_ELIGIBILITY_REQUIREMENTS"
  | "EXTRACT_RISK_CLAUSES"
  | "EXTRACT_TIMELINE"
  | "EXTRACT_DOCUMENT_INVENTORY"
  | "EXTRACT_RESPONSE_STRUCTURE"
  | "ANALYSE_COMPLEXITY"
  | "ESTIMATE_OPPORTUNITY_SIZE"
  | "ANALYSE_PROCUREMENT_BEHAVIOUR"
  | "ANALYSE_EVALUATION_STRATEGY"
  | "ANALYSE_CONTRACT_RISK"
  | "CLASSIFY_OPPORTUNITY_TYPE"
  | "SCORE_TECHNICAL_FIT"
  | "ANALYSE_CAPABILITY_GAPS"
  | "ANALYSE_STAFFING_FEASIBILITY"
  | "ANALYSE_SECTOR_EXPERIENCE"
  | "ANALYSE_TECH_STACK_ALIGNMENT"
  | "ANALYSE_COMPLIANCE_READINESS"
  | "ANALYSE_RELATIONSHIP_DENSITY"
  | "ANALYSE_DECISION_MAKER_PROXIMITY"
  | "ANALYSE_RELATIONSHIP_COVERAGE"
  | "ANALYSE_COMPETITOR_NETWORK_INFLUENCE"
  | "RECOMMEND_RELATIONSHIP_STRATEGY"
  | "IDENTIFY_LIKELY_COMPETITORS"
  | "DETECT_INCUMBENT"
  | "ASSESS_COMPETITIVE_ADVANTAGE"
  | "RECOMMEND_PARTNERS"
  | "ESTIMATE_WIN_PROBABILITY"
  | "RECOMMEND_BID_DECISION"
  | "GENERATE_BID_STRATEGY"
  | "GENERATE_NARRATIVE_POSITIONING"
  | "GENERATE_DIFFERENTIATION_STRATEGY"
  | "ANALYSE_PRICING_STRATEGY"
  | "GENERATE_STAKEHOLDER_ENGAGEMENT_PLAN"
  | "COMPARE_OPPORTUNITIES"
  | "OPTIMISE_PORTFOLIO"
  | "FORECAST_PIPELINE"
  | "DETECT_DOCUMENT_CHANGES"
  | "ASSESS_CHANGE_IMPACT"
  | "IDENTIFY_REUSABLE_CONTENT"
  | "MATCH_CASE_STUDIES"
  | "DETECT_KNOWLEDGE_GAPS";

/** Paradigm enum */
export type Paradigm =
  | "LOW_COST_EXTRACTION"
  | "OPPORTUNITY_INTELLIGENCE"
  | "COMPANY_FIT"
  | "NETWORK_INFLUENCE"
  | "COMPETITIVE_LANDSCAPE"
  | "STRATEGIC_BID_INTELLIGENCE"
  | "CROSS_OPPORTUNITY_INTELLIGENCE"
  | "ADDENDA_CHANGE_ANALYSIS"
  | "KNOWLEDGE_BASE_INTELLIGENCE";

/** Model profile for routing */
export type ModelProfile = "economy" | "balanced" | "deep";

/** Standard request contract for analysis jobs */
export interface AnalysisJobRequest {
  job_id: string;
  analysis_type: AnalysisType;
  paradigm: Paradigm;
  model_profile: ModelProfile;
  model_override?: string | null;
  tenant_id: string;
  opportunity_id?: string | null;
  inputs: AnalysisInputs;
  output_contract?: {
    schema_version: string;
    strict_json: boolean;
    response_schema_path?: string;
  };
}

/** Inputs for analysis jobs */
export interface AnalysisInputs {
  documents?: { id: string; content?: string; name?: string }[];
  company_profile?: Record<string, unknown> | null;
  network_context?: Record<string, unknown> | null;
  knowledge_context?: Record<string, unknown> | null;
  comparison_set?: unknown[] | null;
  /** Free-form context for chat-driven analysis (e.g. user message, opportunity summary) */
  chat_context?: string | null;
}

/** Evidence item from schema */
export interface EvidenceItem {
  source_doc_id: string;
  source_doc_name?: string | null;
  section?: string | null;
  excerpt: string;
  relevance: number;
}

/** Confidence structure */
export interface Confidence {
  overall: number;
  band: "low" | "medium" | "high";
  notes: string;
}

/** Usage metadata */
export interface UsageMetadata {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

/** Timestamps */
export interface Timestamps {
  started_at: string;
  completed_at: string;
  latency_ms: number;
}

/** Model metadata in response */
export interface ModelMetadata {
  provider: "openai";
  model_id: string;
  model_profile: ModelProfile;
  temperature: number;
  reasoning_effort?: "minimal" | "low" | "medium" | "high" | null;
}

/** Canonical AI analysis response envelope */
export interface AIAnalysisResponse {
  schema_version: "1.0.0";
  job_id: string;
  tenant_id: string;
  opportunity_id?: string | null;
  analysis_type: AnalysisType;
  paradigm: Paradigm;
  status: "success" | "partial" | "failed";
  model: ModelMetadata;
  summary: string;
  results: Record<string, unknown>;
  evidence: EvidenceItem[];
  missing_data: string[];
  confidence: Confidence;
  db_records: unknown[];
  usage: UsageMetadata;
  timestamps: Timestamps;
  scores?: {
    technical_fit?: number;
    network_strength?: number;
    opportunity_complexity?: number;
    win_probability?: number;
    pursuit_capacity?: number;
    buyer_access?: number;
    delivery_fit?: number;
    strategic_desire?: number;
    evidence_confidence?: number;
    overall_confidence?: number;
  };
  recommendations?: { code: string; priority: string; action: string }[];
  warnings?: string[];
  errors?: { code: string; message: string; detail?: string | null }[];
}

export interface DecisionDimension {
  score: number;
  status: "strong" | "mixed" | "weak" | "unknown";
  summary: string;
  positives?: string[];
  risks?: string[];
}

/** Strategic bid intelligence results (RECOMMEND_BID_DECISION, etc.) */
export interface StrategicBidIntelligenceResults {
  bid_decision?: {
    decision_state: "Green" | "Amber" | "Red";
    recommendation: "Bid" | "Research" | "No Bid";
    confidence?: number;
    decision_summary?: string;
    rationale?: string[];
    why_now?: string[];
  };
  pursuit_capacity?: DecisionDimension;
  buyer_access?: DecisionDimension;
  delivery_fit?: DecisionDimension;
  strategic_desire?: DecisionDimension;
  evidence_confidence?: DecisionDimension;
  decision_blockers?: string[];
  decision_movers?: string[];
  recommended_research_actions?: {
    action: string;
    reason: string;
    expected_signal?: string | null;
    priority: "low" | "medium" | "high" | "critical";
  }[];
  bid_strategy?: {
    posture: "prime_contractor" | "consortium_lead" | "specialist_partner";
    notes: string[];
  };
  narrative_positioning?: string[];
  differentiation_strategy?: string[];
  pricing_strategy?: {
    pricing_posture: "premium" | "market" | "value" | "penetration";
    notes: string[];
    target_price_band?: { currency: string; amount: number | null };
  };
  stakeholder_engagement?: { action: string; target_stakeholder: string; timing: string }[];
  next_steps?: { step: string; owner: string; due_in_days: number }[];
}

/** Network influence results (SWOT, relationship analysis) */
export interface NetworkInfluenceResults {
  network_strength_score?: number;
  relationship_density?: Record<string, unknown>;
  decision_maker_proximity?: unknown[];
  relationship_coverage?: Record<string, unknown>;
  competitor_network_influence?: Record<string, unknown>;
  relationship_strategy_actions?: unknown[];
}
