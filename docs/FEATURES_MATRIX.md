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

## 4. The Console (User Interface)
The application surface where users interact with the intelligence.

*   **Opportunity Dashboard:** Central hub for tracking discovered, qualified, and active bids.
*   **Organisation Capability Matrix:** A central repository of the company's capabilities, certifications, case studies, and strategic focus, inferred initially via website URL.
*   **Network Map:** Visualisation of relationships and buyer access.
*   **Strategy Chat (AI Assistant):** Context-aware chat interface that can search the workspace, cross-reference opportunities, and trigger deep analysis jobs.

---

## 5. Impending Capabilities (Next in Pipeline)

These features are architected but pending implementation.

*   **Document Ingestion Pipeline:** Extends the AI engine to handle massive PDFs/tender documents via secure, virus-scanned storage and intelligent chunking. Essential for abstracting harmful files away from users' local machines to provide a secondary layer of cybersecurity protection.
*   **Addenda Change Detection:** Automated diffing of document versions to flag risk or compliance changes requiring immediate attention.
*   **Chat Summarisation:** Edge-function compression of long strategy chats to maintain token efficiency without losing critical context.
*   **Stripe Billing Enforcement:** Automated opportunity analysis limits, connector limits, and ad-supported tiers.
