# LinkedIn Learning MVP Approach

This document is a practical review of [LI_learning_API_concept.md](./LI_learning_API_concept.md) against the current BidBlender product and codebase.

The concept doc is directionally strong, but it combines:

- what LinkedIn Learning can actually support today
- what BidBlender can already absorb with low effort
- and a much larger long-term product/strategy narrative

For execution, those need to be separated.

## 1. MVP Thesis

The MVP is not "universal credential intelligence."

The MVP is:

**Bring LinkedIn Learning completion data into BidBlender as a new capability evidence source, then use it to support a basic opportunity-level capability fit view.**

That is defensible, useful, and buildable with the current architecture.

## 2. What Is Already Reusable In The Repo

The current codebase already has several pieces we can reuse:

- Connector scaffolding and tenant-scoped connector state in `connector_sources`
- Server-side OAuth/integration patterns from HubSpot and LinkedIn company-admin
- Capability pillar and organisation profile workflow
- Workspace data loading and intelligence events
- Existing `individual_qualifications` support at organisation level

This means we do **not** need to invent a new integration framework first.

## 3. MVP Scope

### 3.1 In Scope

- LinkedIn Learning connector using **two-legged OAuth / client credentials**
- Tenant-level storage of LinkedIn Learning API credentials and sync metadata
- Pull learner completion/activity data from `learningActivityReports`
- Pull minimal content metadata for observed course URNs from `learningAssets`
- Match learners to BidBlender team members using:
  - `uniqueUserId` first
  - work email second
  - exact name fallback only if explicitly approved
- Store imported records as **learning evidence**, not generic certifications
- Show imported learning evidence inside the Capability pillar
- Generate a simple opportunity-level capability summary:
  - `matched evidence`
  - `missing evidence`
  - `confidence`

### 3.2 Explicitly Out Of Scope

- Competitor LinkedIn profile scraping
- Public-profile credential inference
- "Credential arms race" tracking
- HR performance or promotion signals
- Bidirectional xAPI sync wording or LMS-style writeback
- Full catalog sync of all LinkedIn Learning content
- Credential expiry modelling as a default assumption
- Customer-facing verification APIs / QR verification
- Cross-customer data network effects
- Automated ML-based win correlation

## 4. Why This Should Start With Reporting API, Not xAPI

The concept doc puts xAPI early. For BidBlender, that is not the best MVP starting point.

Use the Reporting API first because it is simpler and more aligned to the product:

- It gives us learner-level activity and completion data directly.
- It is easier to backfill than webhook-only event streams.
- It avoids building inbound webhook auth, retries, replay handling, and event idempotency on day one.
- It maps better to "show me what capability evidence exists today."

xAPI should be phase 2, not MVP.

## 5. Recommended MVP Data Model

The existing `individual_qualifications` field is useful, but it is not the right primary store for LinkedIn Learning evidence.

LinkedIn Learning course completion is not always the same thing as a formal certification.

### 5.1 Minimal New Tables

Create two small tables:

1. `person_identity_links`
- `id`
- `tenant_id`
- `person_id`
- `provider`
- `provider_user_id`
- `provider_email`
- `confidence`
- `last_verified_at`

2. `person_learning_evidence`
- `id`
- `tenant_id`
- `person_id`
- `connector_id`
- `source`
- `external_activity_id` or stable dedupe key
- `content_urn`
- `content_name`
- `asset_type`
- `completion_status`
- `completed_at`
- `seconds_viewed`
- `source_payload`
- `created_at`
- `updated_at`

Optional derived table later:

3. `capability_evidence_summaries`
- org/opportunity rollups

### 5.2 Why Not Reuse `individual_qualifications` As-Is

Because it loses the distinctions we need:

- course completion vs. credential vs. learning path
- person-level evidence lineage
- completion timestamps
- dedupe keys
- sync provenance

We can still derive organisation-level summaries into `individual_qualifications` later if we want a compact display.

## 6. MVP User Experience

### 6.1 Connector UX

Add a new connector:

- `LinkedIn Learning`

States:

- disconnected
- connected
- synced
- partial-match
- error

Actions:

- connect
- sync now
- review learner matches

### 6.2 Capability UX

Add a new section to the Capability pillar:

- `LinkedIn Learning evidence`

Show:

- imported learners
- matched people
- recent completions
- top skills/topics inferred from linked courses
- unmatched learners needing review

### 6.3 Opportunity UX

For MVP, do **not** try to infer all requirements automatically.

Use:

- manually entered capability requirements
- or a lightweight extracted requirement list from the opportunity/rft workflow when available

Then show:

- `evidence present`
- `evidence missing`
- `evidence freshness`
- `confidence`

## 7. MVP Matching Logic

Keep the matching rules simple and auditable.

### 7.1 Matching Order

1. `uniqueUserId` exact match to stored external identity
2. work email exact match
3. exact full name only when there is no ambiguity
4. otherwise route to manual review

### 7.2 Confidence Labels

- `high`: unique ID match
- `medium`: email match
- `low`: exact-name match
- `unmatched`

Do not silently auto-merge ambiguous identities.

## 8. MVP Scoring

The concept doc implies a large scoring layer. The MVP should stay narrower.

### 8.1 Start With 3 Evidence States

- `present`
- `partial`
- `missing`

### 8.2 Start With 3 Confidence States

- `high`
- `medium`
- `low`

### 8.3 Do Not Start With

- ROI modelling
- expiry risk curves
- peer benchmarking
- predictive win scores

## 9. Corrected MVP Roadmap

### Phase 0: Preconditions

- Customer has a LinkedIn Learning enterprise tenant
- Customer can provision `Report` API keys
- Customer can expose stable learner identifiers (`uniqueUserId` and/or work email)
- BidBlender has a place to map learners to people

### Phase 1: Capability Evidence MVP

- LinkedIn Learning connector
- Reporting API ingestion
- learner-to-person matching workflow
- person-level learning evidence store
- capability panel showing imported evidence
- simple opportunity evidence summary

### Phase 2: Operational Improvement

- incremental sync
- xAPI ingestion for near-real-time updates
- on-demand `learningAssets` enrichment
- manual opportunity requirement extraction support

### Phase 3: Intelligence Layer

- automated requirement matching
- course/topic clustering
- recommended upskilling paths
- trend analysis across the tenant

## 10. Highest-Risk Assumptions In The Epic

These are the main items that should be downgraded from MVP assumptions:

- Treating LinkedIn Learning completions as universal credentials
- Assuming expiry dates exist broadly enough to support expiry modelling
- Assuming competitor credential tracking is defensible or compliant
- Assuming customer verification endpoints can be exposed directly from LinkedIn data
- Assuming cross-customer pooled credential data is acceptable
- Assuming person-level matching will work without adding identity link primitives

## 11. Recommendation

Ship the first version as:

**"LinkedIn Learning capability evidence for bid qualification"**

Not as:

**"full credential intelligence platform"**

That positioning is more accurate, easier to defend, and fits the current BidBlender architecture.

## 12. Build Order In This Repo

1. Add `LinkedIn Learning` connector definition and connector page action
2. Add LinkedIn Learning API helper using client credentials
3. Add sync route for `learningActivityReports`
4. Add `person_identity_links` and `person_learning_evidence`
5. Add learner matching UI
6. Add capability evidence surface in organisation / capability views
7. Add lightweight opportunity evidence comparison

If we do only those seven things, we have a real MVP.
