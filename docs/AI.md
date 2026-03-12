# BidBlender AI Analysis Framework

This document defines the AI analysis capabilities that BidBlender should support.

The goal is to structure analysis tasks so they can be:

- metered with credits
- optimised for cost
- modular and reusable
- easy to orchestrate by the platform

BidBlender should separate simple extraction tasks from complex reasoning tasks. This allows inexpensive automation of foundational intelligence while reserving credits for deeper analysis.

## Core Design Principles

1. **Separate extraction from reasoning**
Extraction tasks should be cheap and automatic. Strategic reasoning tasks should consume credits.
2. **Use structured outputs wherever possible**
Many extraction tasks should return structured JSON objects that populate the database.
3. **Reuse analysis outputs**
Outputs should be reusable across features such as opportunity dashboards, comparison tools, bid strategy advice, and partner discovery.
4. **Make analysis modular**
Each analysis function should be an independent analysis type.

Example:

```json
{
  "analysis_type": "EXTRACT_METADATA"
}
```

This enables:

- credit metering
- caching
- orchestration
- scheduled analysis

## Analysis Categories

The analysis system is organised into nine layers, detailed below:

- [Low-Cost Extraction](#1-low-cost-extraction-foundation-layer)
- [Opportunity Intelligence Analysis](#2-opportunity-intelligence-analysis-medium-cost)
- [Company Fit Analysis](#3-company-fit-analysis-higher-cost)
- [Network & Influence Analysis](#4-network--influence-analysis)
- [Competitive Landscape Analysis](#5-competitive-landscape-analysis)
- [Strategic Bid Intelligence](#6-strategic-bid-intelligence-high-cost)
- [Cross-Opportunity Intelligence](#7-cross-opportunity-intelligence)
- [Addenda & Change Analysis](#8-addenda--change-analysis)
- [Knowledge Base Intelligence](#9-knowledge-base-intelligence)

### 1. Low-Cost Extraction (Foundation Layer)

These tasks should be very inexpensive.

They involve structured extraction from tender documents and should generally run automatically when a tender is ingested. They do not require company context.

#### Opportunity Metadata Extraction

Extract basic procurement information.

Fields:

- issuing organisation
- opportunity title
- reference number
- procurement portal
- category
- location or jurisdiction
- estimated value
- closing date
- briefing dates
- contract duration

#### Procurement Structure Extraction

Identify the procurement model:

- RFT
- RFQ
- RFI
- EOI
- panel arrangement
- multi-stage evaluation
- shortlist processes

#### Scope Extraction

Identify:

- core deliverables
- expected services
- technology requirements
- service locations
- operational obligations

#### Evaluation Criteria Extraction

Extract:

- weighted evaluation criteria
- qualitative criteria
- scoring models
- mandatory compliance requirements

#### Eligibility Requirements

Extract requirements such as:

- certifications
- insurances
- financial thresholds
- staff qualifications
- regulatory compliance

#### Risk Clause Extraction

Identify contractual risks:

- liquidated damages
- penalties
- liability clauses
- unusual contractual provisions

#### Opportunity Timeline Extraction

Structure key dates:

- briefing sessions
- Q&A deadlines
- submission deadline
- award timeline
- contract start date

#### Document Inventory

Catalogue all attachments:

- annexes
- schedules
- pricing templates
- technical response forms
- contract drafts

#### Response Structure Extraction

Identify required submission structure:

- response sections
- templates
- page limits
- mandatory attachments

### 2. Opportunity Intelligence Analysis (Medium Cost)

These tasks involve some reasoning but still operate primarily on tender documents.

#### Complexity Assessment

Evaluate overall complexity based on:

- delivery scope
- compliance requirements
- documentation volume
- contractual obligations

Output:

- `complexity_score`
- `Low`, `Medium`, `High`, or `Extreme`

#### Opportunity Size Estimation

Estimate:

- likely project scale
- team size required
- probable contract value if not stated

#### Procurement Behaviour Analysis

Infer behavioural patterns:

- risk tolerance
- preference for incumbents
- openness to innovation
- bureaucratic rigidity

#### Evaluation Strategy Insight

Interpret evaluation weighting.

Example:

- Capability: 60%
- Price: 20%
- Local Presence: 20%

This signals how decisions may be made.

#### Contract Risk Profile

Evaluate exposure including:

- liability limits
- penalty structures
- contract rigidity

#### Opportunity Type Classification

Classify opportunity into internal categories:

- consulting
- technology delivery
- managed services
- infrastructure
- integration
- transformation

### 3. Company Fit Analysis (Higher Cost)

These analyses require a company information payload.

The payload may include:

- services
- certifications
- staff
- case studies
- technology stack
- geographic presence

#### Technical Fit Scoring

Compare company capabilities with opportunity requirements.

Output:

- `technical_fit_score: 0-100`

Provide explanation of:

- strong matches
- partial matches
- missing capabilities

#### Capability Gap Analysis

Identify:

- missing expertise
- missing certifications
- delivery scale issues

#### Staffing Feasibility

Estimate whether the organisation can realistically deliver the project.

Factors include:

- staffing levels
- leadership capacity
- subject matter expertise

#### Sector Experience Matching

Compare buyer sector with company sector experience.

#### Technology Stack Alignment

Match requested technologies with company technology stack.

#### Compliance Readiness

Evaluate whether required certifications and regulatory obligations are satisfied.

### 4. Network & Influence Analysis

This layer uses relationship intelligence, primarily derived from LinkedIn-authorised signals. These signals represent a key differentiator for BidBlender.

#### Relationship Density Analysis

Measure:

- number of connections between bidder and buyer organisations
- density of relationships
- concentration of relationships within departments

Output:

- `network_strength_score`

#### Decision Maker Proximity

Identify connections to:

- procurement staff
- technical stakeholders
- executive leadership

#### Relationship Coverage

Evaluate whether connections exist across key organisational functions.

Examples:

- procurement
- operations
- technical teams
- leadership

#### Competitor Network Influence

Estimate whether competitors have stronger network presence within the buyer organisation.

#### Relationship Strategy Advice

Recommend actions such as:

- warm introductions
- stakeholder meetings
- network expansion
- partner introductions

### 5. Competitive Landscape Analysis

These analyses help evaluate likely competition.

#### Likely Competitor Identification

Based on:

- opportunity type
- buyer procurement history
- industry norms

#### Incumbent Detection

Determine whether a current supplier is likely involved.

#### Competitive Advantage Assessment

Evaluate whether the bidder's advantage is:

- technical
- relational
- pricing
- niche expertise

#### Partner Recommendation

Suggest potential partners to close capability gaps.

#### Win Probability Estimate

Combine multiple factors including:

- technical fit
- network strength
- complexity
- competition

Output:

- `win_probability_score`

### 6. Strategic Bid Intelligence (High Cost)

These tasks provide strategic guidance and are the most resource-intensive.

#### Traffic-Light Decision

Provide a clear traffic-light recommendation:

- Green: Bid
- Amber: Research
- Red: No Bid

Amber is the most important state. Use it when decisive factors are unknown, conflicting, or insufficiently evidenced.

Assess the decision through five dimensions:

- pursuit capacity
- buyer access
- delivery fit
- strategic desire
- evidence confidence

#### Bid Strategy

Advise whether to pursue as:

- prime contractor
- consortium lead
- specialist partner

#### Narrative Positioning

Recommend key messaging themes for the bid.

#### Differentiation Strategy

Identify ways to stand out from competitors.

#### Pricing Strategy Insight

Interpret procurement signals to guide pricing approach.

#### Stakeholder Engagement Strategy

Recommend relationship-building activities:

- meetings
- introductions
- engagement plans

### 7. Cross-Opportunity Intelligence

These analyses compare multiple opportunities simultaneously.

#### Opportunity Comparison

Compare opportunities by:

- complexity
- strategic value
- win probability

#### Portfolio Optimisation

Recommend which opportunities should be prioritised.

#### Pipeline Forecasting

Estimate:

- potential revenue
- effort vs reward
- strategic alignment

### 8. Addenda & Change Analysis

Tender documents often change during procurement. BidBlender should analyse these changes.

#### Document Change Detection

Identify differences between:

- tender versions
- addenda releases

#### Impact Assessment

Explain:

- what changed
- whether the bid strategy must change
- whether risk increased

### 9. Knowledge Base Intelligence

This uses the organisation's internal history.

#### Past Response Reuse

Identify reusable content from past bids.

#### Case Study Matching

Recommend the most relevant case studies for the opportunity.

#### Knowledge Gap Detection

Identify missing internal materials required for a strong bid.

## Credit Tier Model

Analysis tasks should be mapped to credit tiers.

### Tier 1: Extraction (Very Low Cost)

Examples:

- metadata extraction
- criteria extraction
- timeline extraction
- scope extraction

These should be automated during ingestion.

### Tier 2: Opportunity Analysis (Low-Medium Cost)

Examples:

- complexity analysis
- procurement behaviour
- contract risk profile

### Tier 3: Company Fit Analysis (Medium Cost)

Examples:

- technical fit
- capability gap analysis
- staffing feasibility

### Tier 4: Strategic Intelligence (High Cost)

Examples:

- network influence analysis
- competitor analysis
- bid strategy
- win probability estimation

## AI Job Architecture

Each analysis function should be implemented as a distinct AI job type.

Example:

```json
{
  "analysis_type": "EXTRACT_METADATA"
}
```

Example job types:

- `EXTRACT_METADATA`
- `EXTRACT_CRITERIA`
- `ANALYSE_COMPLEXITY`
- `ANALYSE_COMPANY_FIT`
- `ANALYSE_NETWORK_STRENGTH`
- `ANALYSE_COMPETITION`
- `GENERATE_BID_STRATEGY`
- `COMPARE_OPPORTUNITIES`

This allows the system to:

- meter credits
- reuse cached results
- orchestrate analysis workflows
- scale AI operations efficiently

## Core Intelligence Model

BidBlender ultimately derives intelligence from five primary decision dimensions:

- `pursuit_capacity`
- `buyer_access`
- `delivery_fit`
- `strategic_desire`
- `evidence_confidence`

These are interpreted alongside supporting scores and analysis such as:

- `technical_fit`
- `network_strength`
- `opportunity_complexity`
- `competitive_landscape`
- `procurement_behaviour`

Together, these form the basis for bid/no-bid judgement.

This multi-layer model enables BidBlender to reveal where opportunities are actually winnable, rather than simply identifying opportunities that exist.

## Prompt Architecture for Supabase Edge Functions

For short-term implementation, all analysis jobs should run through Supabase Edge Functions and call OpenAI with a single default model. The prompt contract should still include model routing fields now, so model selectiveness can be introduced later without changing every analysis job.

### Runtime Assumptions

- Edge Function endpoint: `run-analysis-job`
- Current model strategy: one model via `OPENAI_MODEL_DEFAULT`
- Future model strategy: route by `model_profile` and `analysis_type`
- Output mode: strict JSON for all machine-consumed jobs

### Standard Edge Request Contract

```json
{
  "job_id": "uuid",
  "analysis_type": "EXTRACT_METADATA",
  "paradigm": "LOW_COST_EXTRACTION",
  "model_profile": "economy",
  "model_override": null,
  "tenant_id": "uuid",
  "opportunity_id": "uuid",
  "inputs": {
    "documents": [],
    "company_profile": null,
    "network_context": null,
    "knowledge_context": null,
    "comparison_set": null
  },
  "output_contract": {
    "schema_version": "1.0.0",
    "strict_json": true,
    "response_schema_path": "docs/AI_RESPONSE_SCHEMA.json"
  }
}
```

### Standard System Prompt Template

```text
You are BidBlender Analyst, an AI system for procurement opportunity intelligence.

Follow these rules:
1. Return valid JSON only. Do not include markdown.
2. Use only provided inputs. Do not invent facts.
3. Include evidence references for key claims.
4. If data is missing, set fields to null and explain gaps in missing_data.
5. Keep outputs concise, decision-useful, and schema-compliant.
```

### Standard Output Contract

All paradigms should return the canonical envelope defined in:

- `docs/AI_RESPONSE_SCHEMA.json`

The schema includes:

- top-level job metadata (`job_id`, `analysis_type`, `paradigm`, `status`)
- model and token usage metadata
- strict paradigm-specific `results` contract
- evidence and confidence structures
- optional direct-ingestion payloads via `db_records`

Minimal envelope example:

```json
{
  "schema_version": "1.0.0",
  "job_id": "uuid",
  "tenant_id": "uuid",
  "analysis_type": "EXTRACT_METADATA",
  "paradigm": "LOW_COST_EXTRACTION",
  "status": "success",
  "model": {
    "provider": "openai",
    "model_id": "string",
    "model_profile": "economy",
    "temperature": 0.2
  },
  "summary": "string",
  "results": {},
  "evidence": [
    {
      "source_doc_id": "string",
      "excerpt": "string"
    }
  ],
  "missing_data": ["string"],
  "confidence": {
    "overall": 0.0,
    "band": "medium",
    "notes": "string"
  },
  "db_records": [],
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0,
    "estimated_cost_usd": 0
  },
  "timestamps": {
    "started_at": "2026-01-01T00:00:00Z",
    "completed_at": "2026-01-01T00:00:01Z",
    "latency_ms": 1000
  }
}
```

### Enforcing Strict Schema at Generation Time

Use schema-constrained JSON generation in the OpenAI call and validate again in Edge Function before persistence.

```ts
const responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "bidblender_ai_analysis_response",
    schema: AI_RESPONSE_SCHEMA_JSON,
    strict: true
  }
};
```

Edge validation pattern:

1. Validate AI response against `docs/AI_RESPONSE_SCHEMA.json`
2. Reject invalid payloads with `status=failed`
3. Persist validated `results` and `db_records` only
4. Store raw payload in audit logs for traceability

### Model Routing Policy

- Short-term: ignore `model_profile` and always use `OPENAI_MODEL_DEFAULT`.
- Mid-term: map `model_profile` to model IDs in one config object.
- Long-term: add policy logic by `analysis_type`, token budget, latency target, and confidence threshold.

Recommended profile intent:

- `economy`: extraction and deterministic structuring
- `balanced`: medium reasoning and synthesis
- `deep`: strategic analysis with multi-factor tradeoffs

## Prompt Structures by Paradigm

Canonical machine schema for all outputs: `docs/AI_RESPONSE_SCHEMA.json`.

The `Output results shape` blocks below are human-readable summaries; implementation must follow the JSON schema exactly.

Schema definition map:

- Low-Cost Extraction: `#/$defs/lowCostExtractionResults`
- Opportunity Intelligence: `#/$defs/opportunityIntelligenceResults`
- Company Fit: `#/$defs/companyFitResults`
- Network & Influence: `#/$defs/networkInfluenceResults`
- Competitive Landscape: `#/$defs/competitiveLandscapeResults`
- Strategic Bid Intelligence: `#/$defs/strategicBidIntelligenceResults`
- Cross-Opportunity Intelligence: `#/$defs/crossOpportunityResults`
- Addenda & Change Analysis: `#/$defs/addendaChangeResults`
- Knowledge Base Intelligence: `#/$defs/knowledgeBaseResults`

### 1. Low-Cost Extraction

Goal: extract explicit facts from tender material with minimal reasoning.

Recommended profile: `economy` (currently resolves to `OPENAI_MODEL_DEFAULT`).

Prompt additions:

```text
Task: Extract structured facts exactly as stated in source material.
Do not infer missing values unless explicitly requested.
Normalise dates, currency, and category labels where possible.
```

Output `results` shape:

```json
{
  "metadata": {},
  "procurement_structure": {},
  "scope": [],
  "evaluation_criteria": [],
  "eligibility_requirements": [],
  "risk_clauses": [],
  "timeline": [],
  "document_inventory": [],
  "response_structure": []
}
```

### 2. Opportunity Intelligence Analysis

Goal: assess opportunity characteristics from tender data with bounded reasoning.

Recommended profile: `balanced`.

Prompt additions:

```text
Task: Assess opportunity complexity, size signals, procurement behaviour, and contract risk.
Use explicit assumptions only when required and mark them clearly in missing_data.
```

Output `results` shape:

```json
{
  "complexity_score": "Low|Medium|High|Extreme",
  "opportunity_size_estimate": {},
  "procurement_behaviour_signals": [],
  "evaluation_strategy_insight": {},
  "contract_risk_profile": {},
  "opportunity_type": "string"
}
```

### 3. Company Fit Analysis

Goal: evaluate fit between opportunity requirements and bidder capabilities.

Recommended profile: `balanced`.

Prompt additions:

```text
Task: Compare tender requirements to company profile, then score fit and identify gaps.
Prioritise capability mismatches that affect delivery feasibility and compliance.
```

Output `results` shape:

```json
{
  "technical_fit_score": 0,
  "fit_rationale": [],
  "capability_gaps": [],
  "staffing_feasibility": {},
  "sector_experience_alignment": {},
  "technology_stack_alignment": {},
  "compliance_readiness": {}
}
```

### 4. Network & Influence Analysis

Goal: quantify relational advantage and stakeholder access.

Recommended profile: `balanced` moving to `deep` for complex networks.

Prompt additions:

```text
Task: Evaluate relationship density, decision-maker proximity, and competitor influence.
Recommend concrete relationship actions with expected impact.
```

Output `results` shape:

```json
{
  "network_strength_score": 0,
  "relationship_density": {},
  "decision_maker_proximity": [],
  "relationship_coverage": {},
  "competitor_network_influence": {},
  "relationship_strategy_actions": []
}
```

### 5. Competitive Landscape Analysis

Goal: infer likely competition and bidder positioning.

Recommended profile: `balanced` moving to `deep` when market context is broad.

Prompt additions:

```text
Task: Identify likely competitors, incumbent advantage, and bidder differentiation options.
Estimate win probability using transparent factor weighting.
```

Output `results` shape:

```json
{
  "likely_competitors": [],
  "incumbent_likelihood": {},
  "competitive_advantage_map": {},
  "partner_recommendations": [],
  "win_probability_score": 0
}
```

### 6. Strategic Bid Intelligence

Goal: convert all available intelligence into a bid decision and execution strategy.

Recommended profile: `deep`.

Prompt additions:

```text
Task: Determine whether the opportunity is Green, Amber, or Red.
Green means bid now. Amber means unresolved uncertainty and targeted research is required. Red means no bid.
Assess the opportunity using these dimensions: Pursuit Capacity, Buyer Access, Delivery Fit, Strategic Desire, and Evidence Confidence.
For Amber, identify the cheapest next actions that would move the decision to Green or Red.
Include positioning, differentiation, pricing posture, and stakeholder engagement plan when relevant.
```

Output `results` shape:

```json
{
  "bid_decision": {
    "decision_state": "Green|Amber|Red",
    "recommendation": "Bid|Research|No Bid",
    "confidence": 0,
    "decision_summary": "",
    "rationale": []
  },
  "pursuit_capacity": {},
  "buyer_access": {},
  "delivery_fit": {},
  "strategic_desire": {},
  "evidence_confidence": {},
  "decision_blockers": [],
  "decision_movers": [],
  "recommended_research_actions": [],
  "bid_strategy": {},
  "narrative_positioning": [],
  "differentiation_strategy": [],
  "pricing_strategy_insight": {},
  "stakeholder_engagement_strategy": []
}
```

### 7. Cross-Opportunity Intelligence

Goal: compare opportunities and optimise portfolio allocation.

Recommended profile: `balanced` or `deep` based on portfolio size.

Prompt additions:

```text
Task: Compare opportunities by complexity, strategic value, and win potential.
Return a ranked recommendation with resource allocation guidance.
```

Output `results` shape:

```json
{
  "opportunity_comparison": [],
  "portfolio_priorities": [],
  "pipeline_forecast": {
    "potential_revenue": {},
    "effort_vs_reward": {},
    "strategic_alignment": {}
  }
}
```

### 8. Addenda & Change Analysis

Goal: detect tender changes and evaluate bid impact.

Recommended profile: `economy` for diffing, `balanced` for impact assessment.

Prompt additions:

```text
Task: Detect differences between versions and assess impact on risk, compliance, and strategy.
Flag changes that require immediate response actions.
```

Output `results` shape:

```json
{
  "change_log": [],
  "impact_assessment": {},
  "risk_delta": {},
  "required_bid_updates": [],
  "urgency_level": "Low|Medium|High|Critical"
}
```

### 9. Knowledge Base Intelligence

Goal: use internal bid history to increase response quality and speed.

Recommended profile: `economy` for retrieval, `balanced` for matching quality.

Prompt additions:

```text
Task: Match opportunity needs to reusable internal assets and identify missing assets.
Prioritise response sections where reuse will materially reduce drafting effort.
```

Output `results` shape:

```json
{
  "reusable_content": [],
  "case_study_matches": [],
  "knowledge_gaps": [],
  "content_requests": [],
  "reuse_priority_order": []
}
```
