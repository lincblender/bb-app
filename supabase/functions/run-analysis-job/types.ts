/**
 * Types for run-analysis-job edge function.
 * Aligned with lib/ai/types.ts.
 */

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

export type ModelProfile = "economy" | "balanced" | "deep";

export interface AnalysisInputs {
  documents?: { id: string; content?: string; name?: string }[];
  company_profile?: Record<string, unknown> | null;
  network_context?: Record<string, unknown> | null;
  knowledge_context?: Record<string, unknown> | null;
  comparison_set?: unknown[] | null;
  chat_context?: string | null;
}

export interface AnalysisJobRequest {
  job_id: string;
  analysis_type: AnalysisType;
  paradigm: Paradigm;
  model_profile: ModelProfile;
  model_override?: string | null;
  tenant_id: string;
  opportunity_id?: string | null;
  inputs: AnalysisInputs;
}

export interface AIAnalysisResponse {
  schema_version: "1.0.0";
  job_id: string;
  tenant_id: string;
  opportunity_id?: string | null;
  analysis_type: AnalysisType;
  paradigm: Paradigm;
  status: "success" | "partial" | "failed";
  model: {
    provider: "openai";
    model_id: string;
    model_profile: ModelProfile;
    temperature: number;
  };
  summary: string;
  results: Record<string, unknown>;
  evidence: unknown[];
  missing_data: string[];
  confidence: { overall: number; band: string; notes: string };
  db_records: unknown[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
  timestamps: { started_at: string; completed_at: string; latency_ms: number };
}

export interface DecisionDimension {
  score: number;
  status: "strong" | "mixed" | "weak" | "unknown";
  summary: string;
  positives?: string[];
  risks?: string[];
}

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
}
