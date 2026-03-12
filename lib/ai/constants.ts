/**
 * AI analysis constants - analysis type to paradigm mapping
 * Aligned with docs/AI_RESPONSE_SCHEMA.json
 */

import type { AnalysisType, Paradigm } from "./types";

/** Maps analysis_type to paradigm */
export const ANALYSIS_TO_PARADIGM: Record<AnalysisType, Paradigm> = {
  EXTRACT_METADATA: "LOW_COST_EXTRACTION",
  EXTRACT_PROCUREMENT_STRUCTURE: "LOW_COST_EXTRACTION",
  EXTRACT_SCOPE: "LOW_COST_EXTRACTION",
  EXTRACT_EVALUATION_CRITERIA: "LOW_COST_EXTRACTION",
  EXTRACT_ELIGIBILITY_REQUIREMENTS: "LOW_COST_EXTRACTION",
  EXTRACT_RISK_CLAUSES: "LOW_COST_EXTRACTION",
  EXTRACT_TIMELINE: "LOW_COST_EXTRACTION",
  EXTRACT_DOCUMENT_INVENTORY: "LOW_COST_EXTRACTION",
  EXTRACT_RESPONSE_STRUCTURE: "LOW_COST_EXTRACTION",
  ANALYSE_COMPLEXITY: "OPPORTUNITY_INTELLIGENCE",
  ESTIMATE_OPPORTUNITY_SIZE: "OPPORTUNITY_INTELLIGENCE",
  ANALYSE_PROCUREMENT_BEHAVIOUR: "OPPORTUNITY_INTELLIGENCE",
  ANALYSE_EVALUATION_STRATEGY: "OPPORTUNITY_INTELLIGENCE",
  ANALYSE_CONTRACT_RISK: "OPPORTUNITY_INTELLIGENCE",
  CLASSIFY_OPPORTUNITY_TYPE: "OPPORTUNITY_INTELLIGENCE",
  SCORE_TECHNICAL_FIT: "COMPANY_FIT",
  ANALYSE_CAPABILITY_GAPS: "COMPANY_FIT",
  ANALYSE_STAFFING_FEASIBILITY: "COMPANY_FIT",
  ANALYSE_SECTOR_EXPERIENCE: "COMPANY_FIT",
  ANALYSE_TECH_STACK_ALIGNMENT: "COMPANY_FIT",
  ANALYSE_COMPLIANCE_READINESS: "COMPANY_FIT",
  ANALYSE_RELATIONSHIP_DENSITY: "NETWORK_INFLUENCE",
  ANALYSE_DECISION_MAKER_PROXIMITY: "NETWORK_INFLUENCE",
  ANALYSE_RELATIONSHIP_COVERAGE: "NETWORK_INFLUENCE",
  ANALYSE_COMPETITOR_NETWORK_INFLUENCE: "NETWORK_INFLUENCE",
  RECOMMEND_RELATIONSHIP_STRATEGY: "NETWORK_INFLUENCE",
  IDENTIFY_LIKELY_COMPETITORS: "COMPETITIVE_LANDSCAPE",
  DETECT_INCUMBENT: "COMPETITIVE_LANDSCAPE",
  ASSESS_COMPETITIVE_ADVANTAGE: "COMPETITIVE_LANDSCAPE",
  RECOMMEND_PARTNERS: "COMPETITIVE_LANDSCAPE",
  ESTIMATE_WIN_PROBABILITY: "COMPETITIVE_LANDSCAPE",
  RECOMMEND_BID_DECISION: "STRATEGIC_BID_INTELLIGENCE",
  GENERATE_BID_STRATEGY: "STRATEGIC_BID_INTELLIGENCE",
  GENERATE_NARRATIVE_POSITIONING: "STRATEGIC_BID_INTELLIGENCE",
  GENERATE_DIFFERENTIATION_STRATEGY: "STRATEGIC_BID_INTELLIGENCE",
  ANALYSE_PRICING_STRATEGY: "STRATEGIC_BID_INTELLIGENCE",
  GENERATE_STAKEHOLDER_ENGAGEMENT_PLAN: "STRATEGIC_BID_INTELLIGENCE",
  COMPARE_OPPORTUNITIES: "CROSS_OPPORTUNITY_INTELLIGENCE",
  OPTIMISE_PORTFOLIO: "CROSS_OPPORTUNITY_INTELLIGENCE",
  FORECAST_PIPELINE: "CROSS_OPPORTUNITY_INTELLIGENCE",
  DETECT_DOCUMENT_CHANGES: "ADDENDA_CHANGE_ANALYSIS",
  ASSESS_CHANGE_IMPACT: "ADDENDA_CHANGE_ANALYSIS",
  IDENTIFY_REUSABLE_CONTENT: "KNOWLEDGE_BASE_INTELLIGENCE",
  MATCH_CASE_STUDIES: "KNOWLEDGE_BASE_INTELLIGENCE",
  DETECT_KNOWLEDGE_GAPS: "KNOWLEDGE_BASE_INTELLIGENCE",
};

/** Paradigm-specific prompt additions from AI.md */
export const PARADIGM_PROMPT_ADDITIONS: Record<Paradigm, string> = {
  LOW_COST_EXTRACTION: `Task: Extract structured facts exactly as stated in source material.
Do not infer missing values unless explicitly requested.
Normalise dates, currency, and category labels where possible.`,

  OPPORTUNITY_INTELLIGENCE: `Task: Assess opportunity complexity, size signals, procurement behaviour, and contract risk.
Use explicit assumptions only when required and mark them clearly in missing_data.`,

  COMPANY_FIT: `Task: Compare tender requirements to company profile, then score fit and identify gaps.
Prioritise capability mismatches that affect delivery feasibility and compliance.`,

  NETWORK_INFLUENCE: `Task: Evaluate relationship density, decision-maker proximity, and competitor influence.
Recommend concrete relationship actions with expected impact.`,

  COMPETITIVE_LANDSCAPE: `Task: Identify likely competitors, incumbent advantage, and bidder differentiation options.
Estimate win probability using transparent factor weighting.`,

  STRATEGIC_BID_INTELLIGENCE: `Task: Determine whether the opportunity is Green, Amber, or Red.
Green means bid now. Amber means unresolved uncertainty and targeted research is required. Red means no bid.
Assess the opportunity using these dimensions: Pursuit Capacity, Buyer Access, Delivery Fit, Strategic Desire, and Evidence Confidence.
For Amber, identify the cheapest next actions that would move the decision to Green or Red.
Include positioning, differentiation, pricing posture, and stakeholder engagement plan when relevant.`,

  CROSS_OPPORTUNITY_INTELLIGENCE: `Task: Compare opportunities by complexity, strategic value, and win potential.
Return a ranked recommendation with resource allocation guidance.`,

  ADDENDA_CHANGE_ANALYSIS: `Task: Detect differences between versions and assess impact on risk, compliance, and strategy.
Flag changes that require immediate response actions.`,

  KNOWLEDGE_BASE_INTELLIGENCE: `Task: Match opportunity needs to reusable internal assets and identify missing assets.
Prioritise response sections where reuse will materially reduce drafting effort.`,
};

/** System prompt template from AI.md */
export const SYSTEM_PROMPT_TEMPLATE = `You are BidBlender Analyst, an AI system for bid/no-bid opportunity intelligence.

Follow these rules:
1. Return valid JSON only. Do not include markdown.
2. Use only provided inputs. Do not invent facts.
3. Include evidence references for key claims.
4. If data is missing, set fields to null and explain gaps in missing_data.
5. Keep outputs concise, decision-useful, and schema-compliant.
6. Strategic decisions must use the traffic-light model: Green = Bid, Amber = Research, Red = No Bid.
7. Amber is not a weak yes. Use Amber when signals conflict or a decisive factor is unknown.
8. For strategic decisions, explicitly state blockers, movers, and next-best research actions.`;

export const BID_DECISION_POLICY = `BidBlender decision policy:
- Objective: decide can we win this, not just can we bid it.
- Evaluate five dimensions: Pursuit Capacity, Buyer Access, Delivery Fit, Strategic Desire, Evidence Confidence.
- Green: enough positive evidence and confidence to bid.
- Amber: mixed signals or decisive unknowns; recommend research actions that reduce uncertainty.
- Red: enough negative evidence and confidence to no-bid.
- Recommendations must be practical, low-cost, and specific to the missing evidence.`;
