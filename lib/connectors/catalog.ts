import type { ConnectorSource, TenderBoard } from "@/lib/types";
import { TENDER_FEED_REGISTRY, feedConnectorId, feedBoardId } from "./feed-registry";

export const AUSTENDER_RSS_URL = "https://www.tenders.gov.au/public_data/rss/rss.xml";

export const CONNECTOR_IDS = {
  linkedin: "conn-linkedin-profile",
  linkedinCompanyAdmin: "conn-linkedin-company-admin",
  hubspot: "conn-hubspot-history",
  // Tender board feed connectors — keyed by feed registry ID
  austender: "conn-feed-austender-cth",
  austenderNsw: "conn-feed-etendering-nsw",
  austenderVic: "conn-feed-tenders-vic",
  austenderQld: "conn-feed-qtenders-qld",
  austenderSa: "conn-feed-etendering-sa",
  austenderWa: "conn-feed-tenders-wa",
  austenderTas: "conn-feed-tenders-tas",
  austenderAct: "conn-feed-tenders-act",
  austenderNt: "conn-feed-tenders-nt",
  tenderlink: "conn-feed-tenderlink",
} as const;

export const TENDER_BOARD_IDS = {
  // Commonwealth (primary — original ID kept for backward compat)
  austender: "tb-austender-cth",
  // States & territories
  nswEtendering: "tb-etendering-nsw",
  vicTenders: "tb-tenders-vic",
  qldQtenders: "tb-qtenders-qld",
  saEtendering: "tb-etendering-sa",
  waTenders: "tb-tenders-wa",
  tasTenders: "tb-tenders-tas",
  actTenders: "tb-tenders-act",
  ntTenders: "tb-tenders-nt",
  // Aggregators
  tenderlink: "tb-tenderlink",
} as const;

export type SetupPillarId = "reach" | "history" | "capability" | "opportunity";

export interface SetupPillarDefinition {
  id: SetupPillarId;
  title: string;
  eyebrow: string;
  body: string;
  connectorId?: string;
  href: string;
  actionQuery?: string;
}

// Generate connector catalog entries for all registered tender feeds.
const TENDER_FEED_CONNECTORS: ConnectorSource[] = TENDER_FEED_REGISTRY.map((feed) => ({
  id: feedConnectorId(feed.id),
  name: feed.name,
  status: "disconnected" as const,
  sourceType: "tender",
  contribution: `${feed.region} government opportunity discovery via ${feed.feedType.toUpperCase()} feed.${feed.note ? " " + feed.note : ""}`,
  config: {
    feed_id: feed.id,
    feed_url: feed.feedUrl,
    feed_type: feed.feedType,
    feed_status: feed.status,
    import_limit: 25,
  },
}));

export const CORE_CONNECTOR_CATALOG: ConnectorSource[] = [
  {
    id: CONNECTOR_IDS.linkedin,
    name: "LinkedIn Identity",
    status: "disconnected",
    sourceType: "network",
    contribution:
      "LinkedIn sign-in identity and member profile basics. This establishes who the user is before any company-page authority is requested.",
    config: {
      setup: "supabase-oauth",
      provider: "linkedin_oidc",
    },
  },
  {
    id: CONNECTOR_IDS.linkedinCompanyAdmin,
    name: "LinkedIn Company Pages",
    status: "disconnected",
    sourceType: "network",
    contribution:
      "Role-verified company-page access, administered organisation profiles, and page-level authority context when the user has LinkedIn permission.",
    config: {
      setup: "oauth",
      provider: "linkedin_oauth",
      scope: "company-admin",
    },
  },
  {
    id: CONNECTOR_IDS.hubspot,
    name: "HubSpot CRM History",
    status: "disconnected",
    sourceType: "crm",
    contribution:
      "Selective deal, company, and contact history. Pulled sparingly to support qualification, not to mirror the CRM.",
    config: {
      setup: "oauth",
      sync_strategy: "selective",
      sync_limits: {
        deals: 8,
        companies: 8,
        contacts: 8,
      },
    },
  },
  ...TENDER_FEED_CONNECTORS,
];

export const CORE_TENDER_BOARDS: TenderBoard[] = TENDER_FEED_REGISTRY.map((feed) => ({
  id: feedBoardId(feed.id),
  name: feed.name,
  description: `${feed.region} government tenders via ${feed.feedType.toUpperCase()} feed.`,
  region: feed.jurisdiction,
}));

// Backward-compat alias so existing austender sync route keeps working.
// The connector was previously "conn-austender-rss" — we now use the registry ID.
/** @deprecated Use CONNECTOR_IDS.austender */
export const LEGACY_AUSTENDER_CONNECTOR_ID = "conn-austender-rss";
/** @deprecated Use TENDER_BOARD_IDS.austender */
export const LEGACY_AUSTENDER_BOARD_ID = "tb-austender";

export const SETUP_PILLARS: SetupPillarDefinition[] = [
  {
    id: "history",
    title: "History via HubSpot",
    eyebrow: "Pillar 1",
    body:
      "Start with CRM history so BidBlender can ground qualification in recent sales memory. Connect HubSpot, then pull only essential deal, company, and contact history. Start lean and fetch deeper context only when an opportunity or client view needs it.",
    connectorId: CONNECTOR_IDS.hubspot,
    href: "/connectors?action=connect-hubspot",
    actionQuery: "connect-hubspot",
  },
  {
    id: "opportunity",
    title: "Opportunity via tender feeds",
    eyebrow: "Pillar 2",
    body:
      "Choose the market source. AusTender is the live Commonwealth feed today. State and territory feeds are available to add. Import a limited set of current notices, then enrich selectively as the user opens them.",
    connectorId: CONNECTOR_IDS.austender,
    href: "/connectors?action=sync-austender",
    actionQuery: "sync-austender",
  },
  {
    id: "capability",
    title: "Capability via Organisation Profile",
    eyebrow: "Pillar 3",
    body:
      "Capture the bidder organisation profile in-app: capabilities, certifications, case studies, and strategic focus. This is the capability pillar until HR/LMS sources are added.",
    href: "/organisation",
  },
  {
    id: "reach",
    title: "Reach via LinkedIn",
    eyebrow: "Pillar 4",
    body:
      "Connect the user's LinkedIn identity first, then authorise company-page access if they administer a LinkedIn page. The goal is role-aware company context, not social-graph replication.",
    connectorId: CONNECTOR_IDS.linkedin,
    href: "/connectors?action=connect-linkedin",
    actionQuery: "connect-linkedin",
  },
];

export function getCoreConnectorDefinition(id: string) {
  return CORE_CONNECTOR_CATALOG.find((connector) => connector.id === id);
}

export function mergeConnectorWithCatalog(
  liveConnector: ConnectorSource | undefined,
  catalogConnector: ConnectorSource
): ConnectorSource {
  return {
    ...catalogConnector,
    ...liveConnector,
    config: {
      ...(catalogConnector.config ?? {}),
      ...((liveConnector?.config as Record<string, unknown> | undefined) ?? {}),
    },
  };
}
