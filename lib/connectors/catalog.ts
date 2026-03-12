import type { ConnectorSource, TenderBoard } from "@/lib/types";

export const AUSTENDER_RSS_URL = "https://www.tenders.gov.au/public_data/rss/rss.xml";

export const CONNECTOR_IDS = {
  linkedin: "conn-linkedin-profile",
  linkedinCompanyAdmin: "conn-linkedin-company-admin",
  hubspot: "conn-hubspot-history",
  austender: "conn-austender-rss",
} as const;

export const TENDER_BOARD_IDS = {
  austender: "tb-austender",
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
  {
    id: CONNECTOR_IDS.austender,
    name: "AusTender RSS Feed",
    status: "disconnected",
    sourceType: "tender",
    contribution:
      "Commonwealth opportunity discovery via the official RSS feed while deeper board parsing is still being built.",
    config: {
      feed_url: AUSTENDER_RSS_URL,
      import_limit: 25,
    },
  },
];

export const CORE_TENDER_BOARDS: TenderBoard[] = [
  {
    id: TENDER_BOARD_IDS.austender,
    name: "AusTender",
    description: "Australian Government ATM notices via the official RSS feed.",
    region: "AU",
  },
];

export const SETUP_PILLARS: SetupPillarDefinition[] = [
  {
    id: "history",
    title: "History via HubSpot",
    eyebrow: "Pillar 1",
    body:
      "Start with CRM history so BidBlender can ground qualification in recent sales memory. Connect HubSpot, then pull only essential deal, company, and contact history. Start lean and fetch deeper context only when an opportunity or client view needs it.",
    connectorId: CONNECTOR_IDS.hubspot,
    href: "/console/connectors?action=connect-hubspot",
    actionQuery: "connect-hubspot",
  },
  {
    id: "opportunity",
    title: "Opportunity via AusTender RSS",
    eyebrow: "Pillar 2",
    body:
      "Choose the market source. Use the official AusTender RSS feed as the interim opportunity source. Import a limited set of current notices, then enrich selectively as the user opens them.",
    connectorId: CONNECTOR_IDS.austender,
    href: "/console/connectors?action=sync-austender",
    actionQuery: "sync-austender",
  },
  {
    id: "capability",
    title: "Capability via Organisation Profile",
    eyebrow: "Pillar 3",
    body:
      "Capture the bidder organisation profile in-app: capabilities, certifications, case studies, and strategic focus. This is the capability pillar until HR/LMS sources are added.",
    href: "/console/organisation",
  },
  {
    id: "reach",
    title: "Reach via LinkedIn",
    eyebrow: "Pillar 4",
    body:
      "Connect the user's LinkedIn identity first, then authorise company-page access if they administer a LinkedIn page. The goal is role-aware company context, not social-graph replication.",
    connectorId: CONNECTOR_IDS.linkedin,
    href: "/console/connectors?action=connect-linkedin",
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
