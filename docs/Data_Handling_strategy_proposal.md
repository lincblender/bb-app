# BidBlender Data Handling Strategy: Retention, Privacy & Compliance

**Purpose:** Define data retention tiers, privacy handling requirements, and legislative compliance obligations for all data types flowing through BidBlender's LinkedIn Learning integration.

---

## I. DATA CLASSIFICATION FRAMEWORK

Data is categorized by:
1. **Sensitivity Level**: PII, PHI, financial, credential, etc.
2. **Retention Tier**: Ephemeral (seconds), Transient (days), Mid-Term (months), Long-Term (years), Permanent (indefinite)
3. **Purpose**: Operational (immediate processing), Analytics (trend/decision support), Compliance (legal obligations), Archival (historical reference)
4. **Legislation**: GDPR, CCPA, LGPD, UK DPA 2018, other regional requirements

---

## II. DATA RETENTION TIERS & SPECIFICATIONS

| **Tier** | **Duration** | **Retention Reason** | **Deletion Method** | **Audit Trail** |
|----------|--------------|---------------------|-------------------|-----------------|
| **Ephemeral** | 1 second - 1 minute | Real-time processing; state machine logic | Automatic memory purge | Minimal (request ID only) |
| **Transient** | 1 hour - 7 days | Session state; temporary processing artifacts | Automatic deletion after TTL | Request logs deleted with data |
| **Operational** | 30-90 days | Business continuity; incident response | Automated batch deletion | Retention logs maintained |
| **Mid-Term** | 6-18 months | Analytics; trend analysis; performance improvement | Scheduled deletion with notice | Audit log retained for 2x duration |
| **Long-Term** | 2-5 years | Win/loss correlation; market intelligence; model training | Legal hold protocol; customer consent renewal | Permanent audit trail |
| **Permanent** | Indefinite | Regulatory requirement; contractual obligation; audit trail | Anonymization + archival | Immutable record |

---

## III. DATA TYPES: DETAILED RETENTION MATRIX

### A. LINKEDIN LEARNING xAPI EVENT DATA

| **Data Type** | **Contents** | **Sensitivity** | **Tier** | **Retention** | **Purpose** | **Legislation** | **Handling** |
|---|---|---|---|---|---|---|---|
| **Raw xAPI Statements (Course Completion)** | Actor, verb, object, timestamp, completion status | Medium (PII + performance) | Transient + Operational | 24 hours (raw); 90 days (processed) | Real-time credential sync; system health monitoring | GDPR Art. 5 (storage limitation) | Log in real-time; process within 24h; aggregate within 90d; delete raw events |
| **Course Progress Events (PROGRESSED)** | Actor, video %, duration, timestamp | Medium (PII + usage) | Transient | 24-48 hours | Monitor if learner is actually engaged (fraud detection); real-time alerts for credential completion | GDPR Art. 6 (lawfulness) | Process for real-time alert only; delete immediately after 48h |
| **Learner Identity (Actor Data)** | Email, user ID, organization attributes, homepage | Medium-High (PII) | Operational + Mid-Term | 90 days raw; 2 years mapped | Map learner to BidBlender user; team credential scorecard; historical tracking | GDPR Art. 13-14 (transparency); CCPA (right to know) | Store securely; hash PII for analytics; expire mappings annually; allow deletion on request |
| **Course Metadata (Object Data)** | Course URN, title, duration, language, skill tags, difficulty | Low (public data) | Permanent | Indefinite | Course catalog; skill taxonomy mapping; trend analysis; ML model training | No personal data | Archive; use for analytics indefinitely |
| **Completion Certificates** | Course name, completion date, expiry date, badge URL | Medium (quasi-public credential) | Long-Term | 5 years | Legal proof of certification; contract compliance; customer audit trails; win/loss analytics | GDPR Art. 5 (accuracy); compliance obligations | Store with customer consent; allow customer to request certificate deletion (soft-delete); maintain audit trail of deletion requests |
| **Learning Activity Audit Logs** | System actions, error codes, API call metadata, latency | Low | Operational | 90 days | System debugging; SLA compliance; incident response | No personal data | Delete after 90d; can be extended if breach investigation ongoing |

**Key Decisions:**
- Raw xAPI statements are **NOT** long-term storage material; process and aggregate within 24 hours
- Learner identity mappings are **GDPR-lawful** only with explicit consent (see Consent section below)
- Course metadata is **public** (LinkedIn Learning publishes it); can be retained indefinitely
- Certificates are retained **5 years** (typical statute of limitations for contract disputes) with customer consent

---

### B. TEAM CREDENTIAL INVENTORY (DERIVED DATA)

| **Data Type** | **Contents** | **Sensitivity** | **Tier** | **Retention** | **Purpose** | **Legislation** | **Handling** |
|---|---|---|---|---|---|---|---|
| **Team Credential Scorecard** | Team member name, certifications held, expiry dates, proficiency score | High (PII + business-sensitive) | Mid-Term + Long-Term | 2 years active; 5 years for contracts | Bid qualification; proposal generation; team capability tracking; customer audits | GDPR Art. 5 (storage limitation); CCPA Art. 1798.140 (PII definition) | Encrypt at rest; access control by role; customer consent required for data use; allow employee opt-out of credential tracking |
| **Credential Expiry Alerts** | Employee name, cert name, expiry date, days-to-expiry | High (PII) | Transient | 7 days post-alert | Trigger training reminders; HR/management alerts | GDPR Art. 5 | Send alert; delete from alert queue after 7 days; maintain only in audit log |
| **Employee Skill Mastery Scores** | Employee name, skill, assessment score, confidence %, date assessed | High (PII + performance appraisal data) | Mid-Term | 18 months | Identify learning velocity; inform promotion decisions; internal talent matching | GDPR Art. 9 (special categories if used in automated decision-making); CCPA | Require explicit consent for creation; store with safeguards; allow employee access/correction; delete upon termination |
| **Credential Acquisition History** | Employee name, course, completion date, time-to-completion, cost | High (PII + HR data) | Long-Term | 3-5 years | ROI analysis; learning patterns; succession planning; employee development tracking | GDPR Art. 4(11) (employee data); labor laws (record-keeping) | Store with access restricted to HR/managers; allow employee access; delete 5 years post-termination per employment law |
| **Credential-to-Opportunity Matchings** | Team member name, opportunity name, credential fit %, match confidence | High (PII + business-sensitive) | Operational + Mid-Term | 90 days (proposals); 2 years (analytics) | Bid decision-making; proposal writing; team assignment logic | GDPR Art. 5 (purpose limitation) | Use only for stated bid/proposal purpose; don't use for unrelated decisions (e.g., performance appraisal) without consent; delete proposals after 2 years |

**Key Decisions:**
- Skill mastery scores created from **internal assessments** (not LinkedIn Learning) require explicit consent because they're used in employment decisions
- Credential-to-opportunity matchings are retained **90 days** for active bid; archived **2 years** for analytics; then deleted
- Employee credential history is retained per **employment law requirements** (typically 3-7 years post-termination)
- All PII requires **access controls** and **audit logging**

---

### C. OPPORTUNITY / RFP DATA

| **Data Type** | **Contents** | **Sensitivity** | **Tier** | **Retention** | **Purpose** | **Legislation** | **Handling** |
|---|---|---|---|---|---|---|---|
| **RFP Credential Requirements (Extracted)** | Customer name, credential names, requirement type (mandatory/preferred), quantity | Medium (customer data + parsed unstructured data) | Long-Term | 3-5 years | Win/loss analytics; market trend analysis; competitor intelligence; proposal reuse | GDPR Art. 6 (lawfulness); CCPA (customer PI) | Customer data (company name) = business contact info (generally lawful); credential requirements = objective market data (low sensitivity); retain for contract disputes + analytics |
| **Full RFP Document** | Customer RFP PDF/Word, including all requirements, T&Cs, scoring criteria, budget hints | High (confidential customer data; competitive intelligence) | Operational + Long-Term | Duration of bid + 3-5 years | Proposal development; contract performance; dispute resolution; compliance audits | GDPR Art. 5 (storage limitation); **Data Processing Agreement required**; contract law (preservation of evidence) | Store with encryption; access control to bid team only; mark as confidential; maintain 3-5 years for dispute resolution; delete per agreement with customer |
| **Parsed RFP Metadata** | Customer, opportunity ID, requirements extracted, credential tags, budget, geography, industry | Medium (customer PI + business intelligence) | Operational + Long-Term | 3-5 years | Opportunity routing; team assignment; trend analysis; competitive intelligence | GDPR Art. 6 | Anonymize where possible (e.g., "SFIA Level 3" vs. customer name); retain for market analytics |
| **Credential Gap Analysis** | Gaps identified, cost to upskill, timeline, recommended courses | Medium (internal analysis) | Operational + Mid-Term | 90 days (active bid); 1 year (analytics) | Bid decision-making; learning planning; ROI estimation | No PII if anonymized | Delete gap analyses after bid closes; retain only anonymized trend data |
| **Bid/No-Bid Decision Log** | Decision (bid/no-bid), decision maker, rationale, credential fit score, timestamp | Medium (business-sensitive) | Operational + Long-Term | Indefinite (business record) | Audit trail; decision consistency analysis; win/loss correlation; regulatory compliance | Contract law (business record keeping) | Immutable audit log; retain indefinitely for compliance; never delete |
| **Win/Loss Outcome** | Opportunity, bid vs. no-bid decision, actual outcome (won/lost/no-decision), margin, credential correlation | High (business intelligence + decision-making history) | Long-Term + Permanent | 5+ years | Model training for credential-to-win correlation; strategic decision-making; continuous improvement | Business necessity (keep as long as relevant) | Anonymize customer identities in shared analytics; retain detailed data for internal analysis; never delete; maintain immutable audit trail |

**Key Decisions:**
- RFP documents must have **Data Processing Agreement (DPA)** because customer may consider them confidential
- Credential requirements extracted from RFPs are **objective market data** (low sensitivity, no DPA needed)
- Full RFP PDFs are retained **3-5 years** per contract law (statute of limitations on disputes)
- Win/loss data is **the crown jewel**; retained **permanently** because historical correlation improves ML models
- Bid decision logs are **immutable audit trails**; never deleted

---

### D. TEAM COMPETITIVE INTELLIGENCE DATA

| **Data Type** | **Contents** | **Sensitivity** | **Tier** | **Retention** | **Purpose** | **Legislation** | **Handling** |
|---|---|---|---|---|---|---|---|
| **Competitor LinkedIn Profile Snapshots** | Competitor company name, employee names (public), job titles, credentials inferred | Medium (public data, inferred PI) | Transient + Mid-Term | 24 hours (raw snapshots); 2 years (processed) | Monitor competitor credential trends; identify emerging skills; competitive positioning | GDPR Art. 4(14) (lawfulness); LinkedIn ToS (scraping policy) | Scrape from **public** LinkedIn profiles only; don't store raw snapshots >24 hours; aggregate into anonymized competitor profiles; comply with LinkedIn ToS |
| **Competitor Win/Loss History** | Competitor name, opportunity name, win/loss status, inferred solution | Medium (public market data) | Mid-Term + Long-Term | 3-5 years | Model competitor bidding patterns; market intelligence; opportunity assessment | Public tender awards (public data) | Retain for market analysis; anonymize if used externally |
| **Competitor Credential Trend Analysis** | Competitor org, aggregate certification counts by type, trend direction (↑↓→) | Medium (aggregated, anonymized) | Long-Term | Indefinite | Strategic positioning; market intelligence; training priority setting | No personal data if aggregated | Retain for strategy; use in internal strategy only (don't disclose to customers absent legitimate business reason) |
| **Competitor SWOT Analysis** | Strengths, weaknesses, opportunities, threats; credential-focused analysis | Medium (strategic analysis) | Mid-Term | 2 years (active); 5 years (archive) | Bid strategy; positioning; go/no-go decisions | No legislation | Retain during active competitive period; archive after opportunity closes; delete after 5 years |

**Key Decisions:**
- Only scrape **public LinkedIn data**; don't use APIs requiring scraping (violates LinkedIn ToS)
- Aggregate competitor credential data; avoid storing individual employee names >24 hours
- Competitor intelligence is retained **2-5 years** for active market intelligence
- Don't share competitor intelligence externally without explicit business justification (could infringe on competitors' privacy/IP)

---

### E. PROPOSAL & CUSTOMER-FACING DATA

| **Data Type** | **Contents** | **Sensitivity** | **Tier** | **Retention** | **Purpose** | **Legislation** | **Handling** |
|---|---|---|---|---|---|---|---|
| **Generated Proposal Document** | Team member names, credentials, photos, biographies, experience, salary ranges (sometimes) | High (PII + employee data) | Operational + Long-Term | Duration of bid + 3-5 years | Contract execution; customer reference; dispute resolution; compliance audit | GDPR Art. 5 (storage limitation); CCPA; contract law | Store with encryption; mark as confidential; access restricted to bid team + customer; expire after contract ends + 3 years (per statute of limitations) |
| **Team Bio / Capability Profile** | Employee name, photo, credentials, experience level, certifications | High (PII + sensitive employment data) | Long-Term | 2-3 years or until employee leaves | Reuse in future proposals; customer reference; marketing material (with consent) | GDPR Art. 13-14 (transparency); CCPA; employee consent required for marketing use | Collect explicit consent for credential inclusion in proposals; update/delete upon employee request; never use for marketing without separate consent |
| **Customer Communication (Credential Claims)** | Credential counts, skill levels, team composition descriptions | Medium (business communication) | Operational + Long-Term | Duration of bid + contract + 3 years | Evidence of promises made; contract compliance verification | GDPR Art. 5 (accuracy); consumer protection law (don't make false claims) | Verify claims against actual LinkedIn Learning data before proposal submission; maintain audit trail of claim verification; delete after contract ends + 3 years |
| **Proposal Drafts / Iterations** | Multiple versions of proposal with credential-related edits | Medium (business record + sensitive data) | Operational | Duration of bid only (typically 2-8 weeks) | Track bid development; decision rationale; continuous improvement | No legislation | Delete after bid closes; don't retain drafts long-term (only final proposal) |
| **Customer Credential Verification Requests** | Customer requests to verify team credentials; verification results returned | Medium (customer request + verification result) | Operational | 2 years | Customer audit trail; proof of verification; respond to customer inquiries | GDPR Art. 5 (accountability) | Log each verification request; retain as proof of due diligence; delete after 2 years (or per customer request) |

**Key Decisions:**
- Proposals contain **high-PII data** (employee names, photos); retain only **3-5 years** per statute of limitations
- Team bios require **explicit consent** for credential inclusion and **separate consent** for marketing use
- Proposal drafts are **deleted after bid closes** (no long-term storage of work-in-progress)
- Credential claims are **verified against LinkedIn Learning data** before sending to customers (audit trail maintained)

---

### F. ANALYTICS & AI MODEL DATA

| **Data Type** | **Contents** | **Sensitivity** | **Tier** | **Retention** | **Purpose** | **Legislation** | **Handling** |
|---|---|---|---|---|---|---|---|
| **Anonymized Win/Loss Training Data** | [feature vector]: credentials held, credential gaps, cost-to-close, competitor creds, win/loss label | Low (anonymized) | Long-Term + Permanent | Indefinite | Train ML models to predict bid success from credential fit; continuous model improvement | GDPR Art. 4(1) (anonymization); no personal data if truly anonymized | Ensure anonymization is irreversible (no ability to re-identify); retain indefinitely for model retraining; audit anonymization method annually |
| **Credential Demand Trends** | Aggregated certification mention counts by month/quarter/region/industry; trend direction | Low (aggregated, non-attributable) | Long-Term | Indefinite | Market trend forecasting; training priority setting; product development prioritization | No personal data | Retain for strategic value; publish externally as thought leadership (with consent) |
| **Correlations: Credentials → Outcomes** | Correlation matrix: specific credentials vs. win rate; margins; customer satisfaction | Low (aggregated, anonymized) | Long-Term | Indefinite | Improve credential recommendation engine; refine win prediction models; guide customer upskilling | GDPR Art. 4(1) (anonymization) | Ensure no ability to trace back to individual opportunities/teams; retain indefinitely as strategic asset |
| **Learner Behavior Analytics** | Aggregate learning patterns: avg. time-to-completion, completion rates, course difficulty distribution | Low (aggregated) | Long-Term | Indefinite | Benchmark learner populations; inform course recommendations; inform training program design | GDPR Art. 4(1) (anonymization) | Anonymize; don't track individual learners in this category; retain for product analytics |
| **Model Prediction Artifacts** | Training data, feature importance, model weights, hyperparameters, performance metrics | Low (ML artifacts) | Long-Term + Permanent | Indefinite (needed to audit model decisions) | Explainability; regulatory compliance (GDPR Art. 22 right to explanation); model versioning; rollback if needed | GDPR Art. 22 (automated decision-making); right to explanation required if model used in hiring/qualification decisions | Retain indefinitely; document model decisions that affect individuals; provide explanations on request |

**Key Decisions:**
- Anonymization is **irreversible** (no linking tables); verified by legal/compliance quarterly
- Model training data is retained **indefinitely** (needed to explain past model outputs and retrain new models)
- Model artifacts are retained **permanently** (needed for GDPR Art. 22 explainability requirement)
- Win/loss correlations are **aggregated** (no individual opportunity/team names); safe for long-term analysis

---

### G. SYSTEM & SECURITY DATA

| **Data Type** | **Contents** | **Sensitivity** | **Tier** | **Retention** | **Purpose** | **Legislation** | **Handling** |
|---|---|---|---|---|---|---|---|
| **Authentication & Access Logs** | User ID, login timestamp, IP address, action performed, resource accessed | Medium (PII + usage data) | Operational | 90 days (standard); 1-2 years (security breach investigation) | Security incident investigation; SLA compliance; compliance audits | GDPR Art. 5 (data minimization); CCPA (PII) | Retain 90 days standard; extend if breach ongoing; hash sensitive fields; delete after retention expires |
| **Data Access Audit Trails** | User, timestamp, data accessed, query parameters, result count | Medium (usage data) | Operational + Mid-Term | 1-2 years | Demonstrate GDPR accountability; respond to data subject access requests (DSARs); detect unauthorized access patterns | GDPR Art. 5 (accountability); CCPA (DSAR requests) | Immutable logs; retain 2 years minimum; don't delete unless legal hold released; allow customers to download audit trails |
| **API Request/Response Logs** | Endpoint, parameters, response status, latency, error codes, timestamp | Low-Medium | Operational | 30-90 days | Debugging; SLA compliance; performance monitoring | No personal data | Standard log rotation; delete after 90 days unless incident ongoing |
| **xAPI Webhook Delivery Logs** | Source (LinkedIn Learning), payload size, delivery status (success/retry/failure), timestamp | Low | Operational | 30 days | Confirm integration health; respond to customer questions about missed updates | No personal data | Standard log rotation; delete after 30 days |
| **Data Breach Incident Logs** | Incident timestamp, data affected, scope (# records), investigation status, remediation | High (regulatory obligation) | Permanent | Indefinite | GDPR breach notification requirement; state AG inquiries; future compliance audits | GDPR Art. 33-34 (breach notification); state breach notification laws | Immutable records; never delete; maintain chain of custody; share with authorities as required |
| **Encryption Keys & Secrets** | API keys, database credentials, encryption key material | Critical (operational necessity) | Permanent | Indefinite | Decrypt data; maintain system operations; key rotation tracking | GDPR Art. 32 (encryption); SOC 2 (key management) | Store in HSM/key vault; never log or expose; rotate regularly (90-day schedule); maintain key escrow for data recovery post-incident |

**Key Decisions:**
- Authentication logs are **deleted after 90 days** unless incident investigation ongoing
- Data access audit trails are **immutable** and retained **2 years** minimum (GDPR Art. 5 accountability)
- xAPI webhook logs are standard **30-day rotation** (low sensitivity)
- Breach logs are **permanent** and never deleted (regulatory requirement)
- Encryption keys are **never logged** and managed separately from operational logs

---

## IV. LEGISLATIVE & PRIVACY COMPLIANCE REQUIREMENTS

### A. GENERAL DATA PROTECTION REGULATION (GDPR)

**Applies to:** All EU residents' data + data processed in EU

| **Principle** | **BidBlender Application** | **Implementation** |
|---|---|---|
| **Art. 5 - Data Minimization** | Collect only PII needed for credential matching; don't retain raw xAPI events long-term | Process xAPI within 24h; aggregate; delete raw events; retain derived credentials only |
| **Art. 5 - Storage Limitation** | Don't retain data longer than necessary | Use retention tiers above; enforce automated deletion; delete upon contract termination |
| **Art. 5 - Purpose Limitation** | Use credential data only for stated purpose (bid qualification); don't use for performance appraisal without consent | Document purpose for each data category; enforce through access controls; log policy violations |
| **Art. 6 - Lawful Basis** | Justify why you're processing each data type | Consent (employee credentials); contract (customer bid data); legitimate interest (competitor intelligence) |
| **Art. 13-14 - Transparency** | Inform employees/customers what data you're collecting | Privacy policy; in-app notices; consent forms; transparent data handling guide (this document) |
| **Art. 17 - Right to Erasure ("Right to be Forgotten")** | Employees/customers can request deletion of their PII | Implement DSAR workflow; delete PII within 30 days; exception for legal holds / audit trails |
| **Art. 18 - Right to Restrict Processing** | If individual objects to processing, must restrict (not delete) data | Support "restricted" data state; exclude from analytics; maintain for legal purposes |
| **Art. 20 - Right to Data Portability** | Individuals can request copy of their data in machine-readable format | Export credential records in CSV/JSON; provide within 30 days |
| **Art. 22 - Automated Decision-Making** | If ML model makes hiring/qualification decisions, provide explanation | Document model's decision; provide explanation on request; allow human override |
| **Art. 32 - Security** | Encrypt sensitive data; maintain audit logs; access controls | Encrypt PII at rest + in transit; TLS 1.2+; audit logging; role-based access |
| **Art. 33-34 - Breach Notification** | Notify authorities + data subjects within 72 hours of breach discovery | Incident response plan; SLA for notification; maintain breach register indefinitely |

**BidBlender Mitigations:**
- **DPA with LinkedIn Learning:** Establish data processor agreement clarifying xAPI data handling
- **Consent Mechanisms:** Explicit opt-in for employee credential tracking; easy opt-out
- **Automated Deletion:** CRON jobs delete data on schedule; immutable audit trail of deletions
- **DSAR Workflow:** 30-day SLA; automate DSAR response (export credentials, proposal references)
- **Privacy by Design:** Anonymize data for analytics; minimize PII collection; data minimization by default

---

### B. CALIFORNIA CONSUMER PRIVACY ACT (CCPA)

**Applies to:** California residents; any company doing business with CA residents

| **Right** | **BidBlender Application** | **Implementation** |
|---|---|---|
| **Right to Know (Art. 1798.100)** | CA residents can request what personal data you hold on them | Implement CCPA DSAR; respond within 45 days with all PII held |
| **Right to Delete (Art. 1798.105)** | CA residents can request deletion of their personal data | Implement deletion workflow; delete within 45 days (exception: legal hold) |
| **Right to Opt-Out (Art. 1798.120)** | CA residents can opt out of "sale of personal information" | If sharing credential data with 3rd parties (e.g., partner consultants), must provide opt-out; don't "sell" unless explicit opt-in |
| **Right to Non-Discrimination (Art. 1798.125)** | Can't penalize CA residents for exercising privacy rights | Don't deny service; don't increase price; don't decrease quality; explain DSAR requests don't affect service |
| **Shine the Light (CA Civ. Code 1798.83)** | CA residents can request list of 3rd parties data shared with | Provide list of partner integrations (HubSpot, Salesforce, API consumers) |
| **CCPA Policy Requirement** | Must have public privacy policy with CCPA-specific disclosures | Add CCPA section to privacy policy; explain data categories, retention, rights |

**BidBlender Mitigations:**
- **Privacy Policy:** Add CCPA section; explain all PII categories; disclose retention periods
- **DSAR Workflow:** Automate CCPA DSAR fulfillment; template responses for common requests
- **Opt-Out Mechanism:** If sharing credential data with partners, provide opt-out link/mechanism
- **Service Non-Discrimination:** Never penalize DSAR requests; maintain same service quality
- **Shine the Light:** Maintain list of data partners; publish in privacy policy

---

### C. BRAZIL GDPR EQUIVALENT (LEI GERAL DE PROTEÇÃO DE DADOS - LGPD)

**Applies to:** Brazilian residents' data; similar to GDPR but with less strict requirements

| **Principle** | **BidBlender Application** | **Implementation** |
|---|---|---|
| **LGPD Art. 5 - Data Minimization** | Collect minimal PII necessary for stated purpose | Same as GDPR; automated deletion; retention limits |
| **LGPD Art. 7 - Lawful Basis** | Justify processing (similar to GDPR Art. 6) | Consent (default); legitimate interest (competitor intelligence); legal obligation (retention) |
| **LGPD Art. 15 - Right to Know** | Individuals can request what PII you hold | Implement LGPD DSAR; respond within 15 days (faster than GDPR/CCPA) |
| **LGPD Art. 16 - Right to Delete** | Individuals can request deletion | 15-day SLA; exception for legal obligations/security reasons |
| **LGPD Art. 18 - Right to Rectify** | Individuals can correct inaccurate data | Implement correction workflow; flag inaccurate credential data; notify customer if used in proposals |

**BidBlender Mitigations:**
- **Privacy Policy:** LGPD-compliant disclosures
- **Data Processing Agreement:** With LinkedIn Learning (if processing Brazilian residents' data)
- **DSAR Workflow:** 15-day SLA (faster than GDPR's 30)
- **Data Correction:** Allow employees to correct own credential records

---

### D. UK DATA PROTECTION ACT 2018 & UK GDPR

**Applies to:** UK residents' data; post-Brexit version of GDPR with UK-specific tweaks

| **Principle** | **BidBlender Application** | **Implementation** |
|---|---|---|
| **UK GDPR Art. 4 - Data Subject Definition** | Individuals have privacy rights when their personal data is processed | Employees, customers, competitors (public profile data) are data subjects |
| **UK GDPR Art. 6 - Lawful Basis** | Same as EU GDPR (but UK ICO applies instead of DPA) | Consent; contract; legal obligation; legitimate interest |
| **UK DPA 2018 Art. 3 - Exemptions** | Journalistic, artistic, literary, research purposes (limited exemptions) | If publishing market research based on credential trends, may have limited exemption |

**BidBlender Mitigations:**
- Same as GDPR (UK GDPR is nearly identical to EU GDPR)
- **UK ICO Correspondence:** If breach occurs, notify UK ICO (not EU DPA)

---

## V. DATA HANDLING BY SENSITIVITY LEVEL

### Tier 1: High-Sensitivity PII (Employee Credentials + Names)

**Data:** Employee name, LinkedIn Learning certifications, completion dates, proficiency scores

**Handling:**
- ✅ **Collect:** Explicit consent from employee before tracking LinkedIn Learning data
- ✅ **Use:** Bid qualification; proposal generation; credential verification; learning recommendations
- ❌ **Don't Use:** Performance appraisals without separate consent; marketing without separate consent
- ❌ **Share:** Don't share with customers unless relevant to proposal/contract; anonymize in analytics
- 🗑️ **Retain:** 2 years (active); 5 years post-termination per employment law; then delete
- 🔒 **Encrypt:** At rest + in transit; access restricted to bid team + employee's manager
- 📋 **Log:** Every access; audit trail retained 2 years
- ⚠️ **Risk:** GDPR breach if consent not obtained; potential discrimination risk if used in performance appraisal

### Tier 2: Medium-Sensitivity Customer/Business Data (RFP Requirements + Opportunities)

**Data:** RFP documents, credential requirements, customer company name, opportunity details

**Handling:**
- ✅ **Collect:** Customer disclosure in proposal/bid process
- ✅ **Use:** Bid qualification; team assignment; analytics (anonymized)
- ❌ **Share:** Don't disclose to competitors without customer permission; don't publish without anonymization
- 🗑️ **Retain:** Duration of bid + 3-5 years per statute of limitations on contract disputes
- 🔒 **Encrypt:** At rest; mark as confidential; access restricted to bid team
- 📋 **Log:** Data access audit trail; retain 2 years
- ⚠️ **Risk:** Breach of confidentiality if shared externally; potential antitrust issue if shared with competitors

### Tier 3: Low-Sensitivity Market Intelligence (Trend Data + Anonymized Analytics)

**Data:** Credential demand trends, aggregate certification counts, anonymized win/loss correlations

**Handling:**
- ✅ **Collect:** Aggregated from multiple sources; no individual attribution
- ✅ **Use:** Market forecasting; strategic planning; thought leadership; product development
- ✅ **Share:** Can publish externally as trend research; cite as "aggregate market data"
- 🗑️ **Retain:** Indefinitely (strategic value)
- 📋 **Log:** No personal audit trail needed (no PII)
- ⚠️ **Risk:** Minimal; ensure anonymization is irreversible before publishing

---

## VI. SPECIFIC DATA HANDLING WORKFLOWS

### Workflow 1: Employee Adds LinkedIn Learning Credential

```
1. Employee completes course on LinkedIn Learning
2. xAPI event sent to BidBlender webhook (automatic)
3. BidBlender receives event; checks employee consent record
   - If consent exists: Ingest event; update credential inventory
   - If NO consent: Log warning; discard event; send notification to employee
4. Process event: Extract employee email, course name, completion date
5. Aggregate within 24 hours: Count credentials by role/team
6. DELETE raw xAPI event after 24 hours (keep only aggregate)
7. Retain credential in inventory for 2 years (or until employee leaves)
8. After employee leaves: Retain for 5 years (employment law); then delete
9. Audit trail of deletion maintained indefinitely
```

**Consent:** Obtained at onboarding or via in-app prompt before credential tracking enabled
**GDPR Compliance:** Lawful basis = consent (Art. 6); purpose limitation = bid qualification only; data minimization = delete raw events
**Deletion:** Automated CRON job runs monthly; identifies employees >5 years post-termination; soft-deletes credentials; maintains audit trail

---

### Workflow 2: Customer Submits RFP; BidBlender Extracts Credential Requirements

```
1. Customer uploads RFP PDF to BidBlender (e.g., via email, portal)
2. BidBlender parses document using NLP; extracts credential requirements
3. Confirm customer consent: "We'll process this RFP for bid planning"
4. Extract data:
   - Customer company name, opportunity ID, budget, timeline (medium sensitivity)
   - Required certifications, skill levels, quantities (low sensitivity; objective market data)
   - Full RFP PDF (high sensitivity; mark confidential)
5. Store:
   - RFP PDF in encrypted vault; access restricted to bid team
   - Extracted requirements in operational DB; can be used for analytics (anonymized)
6. Retain:
   - Full RFP: 3-5 years (statute of limitations on contract disputes)
   - Extracted requirements: 3-5 years for analytics
   - Anonymized trend data (credentials needed): Indefinite
7. Delete raw RFP after retention period; delete customer identifiers in analytics
8. Audit: Log who accessed RFP; maintain 2-year trail
```

**Consent:** Implicit in proposal submission; can make explicit in DPA if customer objects
**GDPR Compliance:** Lawful basis = contract (Art. 6); purpose limitation = bid planning + analytics (anonymized); storage limitation = 3-5 years
**Anonymization:** Remove customer name from trend analytics; keep in internal win/loss records only

---

### Workflow 3: Generate Proposal with Team Credentials

```
1. Bid team decides to submit proposal; triggers credential assessment workflow
2. Query: "Which employees have credentials matching RFP requirements?"
3. Check consent: Only include employees who opted in to proposal use
4. Generate credential inventory subset:
   - Employee name, relevant certifications, completion dates, proficiency scores
5. Create proposal document with team bios:
   - "Jane Doe, Cloud Architect, AWS Solutions Architect Associate (2024)"
   - Pull from credential inventory; cite LinkedIn Learning as verification source
6. Store proposal:
   - Version control (Confluence/SharePoint); access restricted to bid team
   - Encrypt; mark confidential; metadata: customer, opportunity, classification
7. Verify credential claims:
   - Audit check: Do team bios accurately reflect LinkedIn Learning data?
   - Flag discrepancies; don't submit if claims unverifiable
8. Send proposal to customer; include note: "Team credentials verified via LinkedIn Learning"
9. Retain proposal:
   - If contract won: 5 years post-contract (dispute resolution); then delete
   - If lost: 2 years (competitive analysis); then delete
10. Delete after retention: Soft-delete (archive); hard-delete after 7 years (legal hold period)
11. Audit trail: Log all proposal access; maintain 2 years
```

**Consent:** Employee consent required before including name/credentials in proposal
**GDPR Compliance:** Lawful basis = contract + legitimate interest; employee notification = privacy policy + proposal handling notice
**Audit:** Proposal integrity checked before sending; credential claims verified against LinkedIn Learning data
**Retention:** Post-contract window for dispute resolution; then deleted per schedule

---

### Workflow 4: Respond to Data Subject Access Request (DSAR)

```
1. Employee/customer submits DSAR: "Give me all data you hold on me"
2. Receive request:
   - Validate identity (email verification or signed request)
   - Log request; note 30-day SLA (GDPR) or 45-day SLA (CCPA)
3. Identify data in systems:
   - LinkedIn Learning credentials (if employee)
   - Proposal references (if customer)
   - Access logs mentioning the person
   - Assessment scores (if created internally)
4. Extract all relevant data:
   - Credential inventory entries
   - Proposal excerpts containing their name
   - Access log entries
   - Assessment results
5. Compile DSAR response:
   - Export in CSV/JSON (right to portability)
   - Include human-readable explanations
   - Redact information about 3rd parties (don't disclose other employees' credentials)
6. Send response:
   - Email (or secure portal) within 30 days
   - Confirm receipt; note no action taken based on request
7. Log response:
   - Audit trail of DSAR + response + date fulfilled
   - Maintain indefinitely
```

**GDPR Compliance:** Art. 15 (right to access); Art. 20 (right to portability); 30-day response window
**CCPA Compliance:** Similar; 45-day response window for CA residents
**Data Portability:** Export in machine-readable format (CSV/JSON)
**Redaction:** Remove other employees' credentials; release only person's own data

---

### Workflow 5: Respond to Deletion Request (Right to Erasure)

```
1. Employee/customer requests deletion: "Delete my data"
2. Receive request:
   - Validate identity
   - Log request; note 30-day response SLA
3. Assess deletion feasibility:
   - Credentials can be deleted from active inventory
   - Proposal references in documents: Redact employee name (don't delete entire document; other info may be needed for audit)
   - Audit logs: Cannot delete (legal hold); restrict to read-only
   - Win/loss data: Cannot delete (legal obligation; part of business record)
4. Execute deletion:
   - Mark credential records as "deleted" (soft-delete); don't hard-delete initially
   - Anonymize in proposals (redact name; keep role/skills)
   - Update audit logs to note "data subject deletion request" (so we can explain why data is missing)
5. Confirm deletion:
   - Email person: "Credentials deleted from active systems; retained only for legal/audit purposes"
   - Note: Data retained in audit logs, proposals, contracts (legal obligation)
6. Log response:
   - Deletion request + date fulfilled
   - Maintain audit trail of deletion indefinitely
```

**GDPR Compliance:** Art. 17 (right to erasure); 30-day response window
**Exceptions:** Legal hold (retention required); audit logs (necessary for accountability); business records (statute of limitations)
**Soft-Delete:** Initial deletion marks as "deleted"; hard-delete only after retention period expires
**Transparency:** Explain to person what data is retained and why (legal obligations)

---

### Workflow 6: Security Incident (Data Breach)

```
1. Security incident detected (e.g., unauthorized access, data exfiltration)
2. Immediate response:
   - Contain breach (disable account, reset credentials, isolate systems)
   - Initiate investigation (what data, how much, who affected, how long)
3. Determine severity:
   - Personal data affected? (credentials, employee names, customer data)
   - High risk of harm to individuals? (e.g., if used for discrimination, identity theft)
4. Breach notification:
   - If HIGH risk: Notify affected individuals within 72 hours (GDPR)
   - Notify data protection authority (GDPR) + state AG (for US breaches)
   - Provide: What happened, what data, what we're doing, contact info for questions
5. Investigation:
   - Determine root cause; document thoroughly
   - Review audit logs (access logs maintained in system)
   - Preserve evidence (don't delete logs; maintain chain of custody)
6. Remediation:
   - Fix vulnerability; implement additional controls
   - Offer credit monitoring if relevant
   - Update security policies; train team
7. Documentation:
   - Create incident record; maintain indefinitely
   - Include: Timeline, data affected, individuals notified, remediation steps
   - NEVER delete incident records (regulatory requirement)
8. Post-incident:
   - Extend audit log retention 2+ years (investigation ongoing)
   - Consider regulatory audit/fine; cooperate with authorities
```

**GDPR Compliance:** Art. 33 (authority notification within 72 hours); Art. 34 (individual notification if high risk)
**CCPA Compliance:** CA breach notification law; notify CA AG if >500 CA residents affected
**Documentation:** Maintain incident record indefinitely; critical for demonstrating GDPR Art. 32 security measures
**Immutable Logs:** Never delete audit logs during/after incident; maintain chain of custody

---

## VII. TECHNICAL IMPLEMENTATION REQUIREMENTS

### 7.1 Database Design

| **Aspect** | **Requirement** | **Rationale** |
|---|---|---|
| **Encryption** | PII encrypted at rest (AES-256); in transit (TLS 1.2+) | GDPR Art. 32; protect against unauthorized access |
| **Data Classification** | Tag all columns with sensitivity level (High/Medium/Low) | Enforce retention policies; access controls; audit logging |
| **Retention Columns** | `created_at`, `expires_at`, `retention_tier`, `deletion_scheduled_date` | Automated deletion; audit trail; legal hold support |
| **Soft-Delete Pattern** | `deleted_at` column; don't hard-delete immediately | Reversibility for DSAR corrections; audit trail preservation |
| **Access Control Lists** | `data_owner`, `access_level`, `expiry_date` | Enforce principle of least privilege; audit who accessed what |
| **Immutable Audit Trail** | Append-only table; `event_type`, `user_id`, `timestamp`, `data_before`, `data_after` | GDPR Art. 5 (accountability); prove who changed what/when |
| **Key Rotation** | Encryption keys rotated 90-days; old keys kept in escrow 2+ years | GDPR Art. 32; decrypt historical data if needed; regulatory audits |

### 7.2 Automated Deletion Jobs

```yaml
Cron Jobs:
  - xAPI_Raw_Event_Deletion:
      Schedule: Daily at 2:00 AM
      Target: Events older than 24 hours
      Exclusion: If incident investigation ongoing
      Logging: Immutable audit trail of deletion
      
  - Credential_Expiration_Alerts:
      Schedule: Daily at 8:00 AM
      Target: Credentials expiring in 30/60/90 days
      Action: Notify employee + manager; don't delete yet
      Retention: Alert record kept 7 days; then deleted
      
  - Proposal_Archive_&_Delete:
      Schedule: Weekly
      Target: Proposals older than contract+3 years
      Action: Archive to cold storage; soft-delete from main DB
      Retention: Keep in archive 7 years; then hard-delete
      Logging: Immutable record of what was deleted/when
      
  - Audit_Log_Rotation:
      Schedule: Monthly
      Target: Logs older than 90 days
      Action: Move to archive; compress; encrypt
      Retention: 2+ years for GDPR Art. 5 accountability
      
  - Post_Termination_Credential_Retention:
      Schedule: Quarterly
      Target: Employees terminated >5 years ago
      Action: Soft-delete credentials; maintain audit record
      Retention: Audit trail kept indefinitely
```

### 7.3 Access Control Implementation

| **Role** | **Can Access** | **Retention** | **Audit** |
|---|---|---|---|
| **Employee** | Own credential records; own proposal references | Self-service | Audit log of views |
| **Manager** | Team's credential records; team's proposals | Manage team | All access logged |
| **Bid Team** | RFP documents; credential assessments; proposal drafts | Bid duration + 2 years | All access logged |
| **Finance/Compliance** | Audit logs; deletion records; breach records | Indefinite | Restricted access |
| **Customer Success** | Anonymized credential trends; team capability summaries | 2 years | Restricted access |
| **Contractor/Vendor** | No direct access; API access only (read-only team credentials for verification) | Per contract | All API calls logged |

### 7.4 API Throttling & Rate Limiting (Privacy Protection)

```
Rate Limits:
- DSAR Bulk Export: 1 request/day (prevent scraping all PII)
- Credential Lookup API: 1000 requests/day per customer (prevent enumeration attacks)
- xAPI Webhook Ingestion: 10,000 events/day per customer (prevent abuse)
- Proposal Access: 100 reads/day per customer (prevent credential harvesting)

Audit: All rate limit violations logged; alerts if threshold exceeded
```

---

## VIII. CONSENT MANAGEMENT

### 8.1 Consent Types & Documentation

| **Consent Type** | **Use Case** | **Documentation** | **Revocation** | **Expiry** |
|---|---|---|---|---|
| **LinkedIn Learning Integration Consent** | Allow BidBlender to ingest employee's course completions from LinkedIn Learning | Signed in-app; recorded in audit trail | 1-click opt-out; disable in settings | Annual renewal; expires if employee deactivates LinkedIn Learning |
| **Proposal Use Consent** | Allow employee name + credentials to appear in proposals to customers | Checkbox in credential profile; consent form | Revoke at any time; affects future proposals only | Per bid; expires with contract |
| **Marketing Use Consent** | Allow employee name + photo to be used in marketing materials (blog posts, case studies) | Separate explicit consent form; signed | Revoke at any time; remove from marketing | Annual renewal or until consent revoked |
| **Assessment Consent** | Allow BidBlender to create internal skill assessments; use results in employment decisions | Explicit consent before assessment begins | Opt-out of future assessments | Per assessment; results kept 3 years |

### 8.2 Consent Withdrawal Workflow

```
1. Employee revokes consent: "Stop tracking my LinkedIn Learning credentials"
2. System response:
   - Immediately: Stop ingesting new xAPI events for this employee
   - Within 24 hours: Remove from active credential inventory
   - Within 7 days: Remove from current proposal drafts (mark as "missing credential" if critical)
   - Within 30 days: Delete from historical credential records (per DSAR)
3. Notify:
   - Employee: Confirmation of consent withdrawal
   - Bid team: "Jane's credentials no longer available; team qualification changed"
   - Manager: "Jane has disabled credential tracking; may affect project staffing"
4. Audit:
   - Immutable record of consent withdrawal
   - Track impact: Which proposals were affected?
   - Maintain indefinitely
```

---

## IX. THIRD-PARTY INTEGRATIONS & DATA SHARING

### 9.1 Data Shared with Platform Partners

| **Partner** | **Data Shared** | **Purpose** | **Frequency** | **DPA Required** | **Retention** |
|---|---|---|---|---|---|
| **LinkedIn Learning** | Learner email, course completion events (xAPI) | Verify credentials; sync completions | Real-time | Yes (data processor agreement) | Per LinkedIn Learning's policy |
| **HubSpot** | Opportunity name, credential fit %, team capacity | Enrich opportunity record; proposal recommendations | Daily sync | Yes (HubSpot is processor) | Per HubSpot retention policy |
| **Salesforce** | Opportunity, team credentials, bid outcome | Enrich account/opportunity; track performance | Daily sync | Yes (Salesforce is processor) | Per Salesforce retention policy |
| **HRIS (Workday)** | Employee name, role, credentials held | Update employee records; talent planning | Weekly sync | Yes (HRIS is processor) | Per HRIS retention policy |
| **Analytics (Snowflake)** | Anonymized win/loss data; aggregated credentials; trends | Advanced analytics; BI dashboards | Weekly sync | No (data is anonymized) | Indefinite |
| **Email (Slack)** | Credential completion notifications; learning recommendations | Real-time alerts to team | Triggered | No (notification only) | 30-day log retention |

**DPA Requirement:** Executed with all data processors; specifies sub-processors, data handling, deletion obligations

### 9.2 Data NOT Shared

- **Individual employee credentials** (not shared with external customers without explicit consent)
- **Customer RFP documents** (confidential; never shared externally)
- **Proposal documents** (proprietary; never shared externally)
- **Competitor intelligence** (internal only; could violate competitors' privacy)
- **Unencrypted PII** (always encrypted if transmitted to 3rd parties)

---

## X. COMPLIANCE CHECKLISTS

### Pre-Launch Checklist

- [ ] Privacy policy published; includes GDPR, CCPA, LGPD sections
- [ ] Consent forms created; deployed in app
- [ ] DSAR workflow documented; SLA <30 days
- [ ] Deletion workflow tested; automated jobs working
- [ ] DPA executed with LinkedIn Learning (data processor agreement)
- [ ] Data encryption enabled (at rest + in transit)
- [ ] Access controls configured (role-based)
- [ ] Audit logging implemented; immutable trail
- [ ] Incident response plan documented; 72-hour notification procedure
- [ ] Retention schedules configured; automated deletion jobs active
- [ ] Anonymization methods verified; irreversible de-identification
- [ ] Key rotation procedure established (90-day schedule)

### Quarterly Compliance Audit

- [ ] Review GDPR/CCPA/LGPD requirements; check for changes
- [ ] Audit consent records; ensure all active users have valid consent
- [ ] Verify automated deletion jobs executed; check logs
- [ ] Anonymization review; ensure irreversibility
- [ ] Access log review; check for unauthorized access
- [ ] DPA review with partners; ensure compliance
- [ ] Data classification audit; ensure all sensitive data tagged
- [ ] Retention schedule review; check for overdue deletions
- [ ] Encrypt key audit; ensure rotation on schedule
- [ ] DSAR response time audit; ensure <30-day compliance
- [ ] Test incident response; simulate data breach scenario

---

## XI. SUMMARY TABLE: WHAT TO KEEP, WHAT TO DELETE

| **Data Category** | **Tier** | **Retention** | **Delete Process** | **Audit Trail** | **Exception** |
|---|---|---|---|---|---|
| **xAPI Raw Events** | Ephemeral | 24 hours | Auto-delete | Request ID only | Investigation ongoing |
| **Course Progress Events** | Transient | 24-48 hours | Auto-delete | Request ID only | None |
| **Learner Identity (email/ID)** | Operational | 90 days (raw); 2 years (mapped) | Soft-delete; immutable record | Full audit trail | Employee opt-in required |
| **Credentials Held** | Mid-Term + Long-Term | 2 years active; 5 years post-term | Soft-delete; archive | Audit trail maintained | Legal hold; employment law |
| **RFP Documents** | Long-Term | 3-5 years | Archive then hard-delete | Immutable log | Statute of limitations |
| **Proposals** | Operational + Long-Term | Bid + 3 years | Soft-delete; archive | Audit trail | Contract disputes |
| **Win/Loss Outcomes** | Permanent | Indefinite | Never | Immutable record | Strategic asset; model training |
| **Audit Logs** | Operational + Permanent | 90 days standard; 2 years GDPR | Rotate/archive after retention | Immutable | Active investigation; breach investigation |
| **Competitor Intelligence** | Mid-Term | 2-5 years | Delete after retention | Audit trail | None |
| **Access Logs** | Operational | 90 days | Auto-rotate | Immutable | Security incident investigation |
| **Encryption Keys** | Permanent | Indefinite | Key rotation (90-day); escrow old keys | Immutable | Data recovery needs |

---

## XII. GDPR DATA RETENTION FLOWCHART

```
Data Received → Classify Sensitivity → Determine Purpose → Select Retention Tier

EPHEMERAL (1 sec - 1 min)
├─ xAPI raw events (process, aggregate, delete)
├─ Memory-only state machines
└─ Delete: Automatic memory purge

TRANSIENT (1 hour - 7 days)
├─ Course progress events (alert, then delete)
├─ Session data
├─ Credential alert records
└─ Delete: Auto after TTL

OPERATIONAL (30-90 days)
├─ xAPI aggregated credentials (update inventory, keep until replaced)
├─ Recent access logs
├─ Learning activity audit logs
├─ Request logs
└─ Delete: Automated batch; immutable record of deletion

MID-TERM (6-18 months)
├─ Active team credential inventory (2 years)
├─ RFP requirements (anonymized, 3-5 years)
├─ Employee credential acquisition history (3 years)
├─ Competitor intelligence (2-5 years)
└─ Delete: Scheduled; soft-delete with audit trail

LONG-TERM (2-5+ years)
├─ Proposals (3-5 years post-contract)
├─ Team credential history (3-5 years post-termination)
├─ RFP documents (3-5 years per statute of limitations)
├─ Access audit logs (2 years for GDPR Art. 5)
└─ Delete: Archive to cold storage; hard-delete after 7-year legal hold

PERMANENT (Indefinite)
├─ Win/loss outcomes (model training; strategic value)
├─ Breach incident records (regulatory requirement)
├─ Immutable audit logs (GDPR Art. 5 accountability)
├─ Encryption key escrow (data recovery)
└─ Delete: Never

DSAR REQUEST (Art. 15) → Compile all data → Respond 30 days → Log response
RIGHT TO ERASURE (Art. 17) → Assess feasibility → Delete (except legal hold) → Confirm 30 days → Log
BREACH NOTIFICATION (Art. 33-34) → Investigate 72 hours → Notify DPA + affected individuals → Maintain incident record indefinitely
```

---

## CONCLUSION

This data handling strategy establishes clear guidelines for what to collect, how long to keep it, when to delete it, and how to comply with GDPR, CCPA, LGPD, and UK DPA 2018. The framework balances:

- **Operational Efficiency:** Keep data needed for business processes (bid qualification, proposal generation)
- **Privacy & Compliance:** Minimize PII collection; delete promptly; provide transparency
- **Strategic Value:** Retain win/loss analytics long-term for model training
- **Legal Risk Mitigation:** Maintain audit trails; support DSAR/deletion requests; document compliance

Key principles:
1. **Data Minimization:** Don't collect what you don't need; delete as soon as retention period expires
2. **Purpose Limitation:** Use data only for stated purpose; separate consent for different uses
3. **Transparency:** Document policies; respond to individual requests within 30 days
4. **Security:** Encrypt sensitive data; maintain audit logs; support incident response
5. **Accountability:** Immutable records of all processing; demonstrate GDPR compliance

---

**Document Version:** 1.0 | **Last Updated:** March 2026 | **Classification:** Confidential - Compliance & Legal