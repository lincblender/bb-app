# BidBlender Platform Features

This document is the central source of truth for all current and impending capabilities within the BidBlender platform. It is designed to be referenced when updating the marketing website (`bidblender.com`) to ensure feature parity between the sales messaging and the live application.

---

## 1. Intelligence Connectors (Data Sources)
BidBlender pulls live signals from across the web and internal business systems to contextualise opportunities.

*   **AusTender Integration (Active):** Multi-feed expansion providing three-level data gathering for Australian Commonwealth opportunities. Automatic syncing of ATMs.
*   **LinkedIn Identity & Reach (Active):** OAuth integration linking the user's professional identity and capturing company page administration rights for role-aware context.
*   **Website Profile Inference (Active):** AI-driven capability that scrapes a company's website URL during onboarding to automatically build a complete procurement and capability profile.
*   **HubSpot CRM History (Planned):** Selective deal, company, and contact history syncing for qualification context without mirroring the entire CRM.

## 2. Dynamic Model Routing (AI Engine)
BidBlender doesn't rely on a single AI model. It uses a **Manifest-First Architecture** to dynamically route tasks to the most appropriate, cost-effective, or capable model.

*   **Strategic Bid Intelligence:** Routed to advanced reasoning models (e.g., OpenAI `o3-mini`) for high-complexity, traffic-light (Green/Amber/Red) decision making.
*   **Opportunity & Company Intelligence:** Routed to balanced models (e.g., `gpt-5-mini`) for solid reasoning at a moderate cost.
*   **Low-Cost Extraction & Addenda:** Routed to nano/mini models (e.g., `gpt-5.4-nano`) for high-volume, low-complexity data extraction to conserve cost.
*   **Edge Function Robustness (Active):** Full exponential backoff retries, tenant rate limiting, and progressive validation ensure the AI layer degrades gracefully instead of hard-crashing.

## 3. Opportunity Analysis (The Core Engine)
The core `run-analysis-job` edge function validates and structures AI outputs according to strict BidBlender paradigms.

*   **Traffic-Light Bid Decisions:** Opportunities are scored as Green (Bid), Amber (Research), or Red (No Bid). *Note: Amber explicitly requires the AI to recommend low-cost actions to resolve uncertainty.*
*   **Five-Dimension Assessment:** Every opportunity evaluates Pursuit Capacity, Buyer Access, Delivery Fit, Strategic Desire, and Evidence Confidence.
*   **Competitor Landscape Profiling:** AI identifies likely competitors, detects incumbent advantage, and estimates win probability based on market factors.
*   **Network Influence Analysis:** Maps relationship density, decision-maker proximity, and recommends concrete relationship actions.

## 4. Secure Logistics & Document Intelligence
Advanced handling and parsing of massive bid portfolios.

*   **Document Ingestion Pipeline (Active):** Mass ingestion of generic PDFs/tender documents via a secure, virus-scanned `S3` quarantine. Uses intelligent chunking (`pgvector`) to safely query massive domains without user-machine risk.
*   **Addenda Change Detection (Active):** Automated monitoring of remote portals and document uploads. Evaluates "Material Shifts" explicitly natively mapping to the base opportunity schema, immediately triggering real-time UI notification bells.
*   **Chat Compression (Active):** Silently running Edge Micro-service that truncates and distills sprawling Context boundaries automatically to maintain high-efficiency Token burn without discarding institutional logic.

## 5. Collaboration & Data Governance (The Console)
The application surface where distributed teams and cross-pollinated enterprises interact with the intelligence.

*   **Opportunity Dashboard & Matrix:** Central repository for tracking pipeline, capabilities, certifications, case studies, and network maps.
*   **Data Clean Rooms & Legal Arbitrage (Active):** A revolutionary B2B secure environment allowing parties to query sensitive documents *without* taking custody of them. A Buyer can upload a highly-sensitive RFP. Vendors use BidBlender's AI to qualify the bid *before* signing complex Non-Disclosure Agreements (NDAs). Row-level security blocks foreign RAW downloads while yielding safe analytical intelligence—massively speeding up business cycles.
*   **Secure Teaming & Multiplayer Workspaces (Active):** This same Clean Room structure empowers competing prime contractors to pool their data for a single joint bid mathematically guaranteeing neither party can steal the other's source files. Their live prompts array instantly onto each other's screen natively through Supabase Realtime synchronization.

---

## 6. Impending Capabilities (Next in Pipeline)

These features are architected but pending implementation.

*   **Stripe Billing Enforcement:** Operationalizing the telemetry collected from token efficiency to implement automated limits and ad-supported enterprise tiers.
*   **Export Pipeline:** Aggregating dynamic chat findings and intelligence blocks into raw formatting for MS Word and Excel compliance matrices.
*   **CRM Webhook Integration:** Live write-backs to external Customer Relationship Managers automatically shifting opportunities upon strategy generation.
