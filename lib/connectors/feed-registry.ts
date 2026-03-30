/**
 * Feed registry — all known Australian government tender feeds and private aggregators.
 *
 * Each entry drives both the connector catalog and the generic sync route.
 * Custom (user-added) feeds are stored in connector_sources with sourceType "tender"
 * and are not listed here; the generic sync route handles them by reading the
 * feed_url from the connector config.
 *
 * Status guide:
 *   verified   → URL confirmed working, tested against live data
 *   unverified → URL derived from portal docs / public knowledge, not yet validated
 *   placeholder → Portal known but RSS/API URL needs discovery
 */

export type FeedType = "rss" | "atom" | "json-api";
export type FeedStatus = "verified" | "unverified" | "placeholder";

export type FeedJurisdiction =
  | "AU-CTH" // Commonwealth
  | "AU-NSW" // New South Wales
  | "AU-VIC" // Victoria
  | "AU-QLD" // Queensland
  | "AU-SA" // South Australia
  | "AU-WA" // Western Australia
  | "AU-TAS" // Tasmania
  | "AU-ACT" // Australian Capital Territory
  | "AU-NT" // Northern Territory
  | "AGGREGATOR" // Private aggregators (TenderLink, VendorPanel, etc.)
  | "CUSTOM"; // User-defined

/**
 * Field mapping for feeds whose RSS/Atom tags differ from standard names.
 * Omit a field to accept the default.
 */
export interface FeedFieldMap {
  /** Root item tag. Defaults: "item" (RSS) or "entry" (Atom). */
  item?: string;
  /** Notice title. Default: "title". */
  title?: string;
  /** Canonical notice URL. Default: "link" (RSS) / "link[href]" (Atom). */
  link?: string;
  /** Stable unique ID. Default: "guid" (RSS) / "id" (Atom). */
  guid?: string;
  /** Short description/summary. Default: "description" (RSS) / "summary" (Atom). */
  description?: string;
  /** Publication date. Default: "pubDate" (RSS) / "updated" (Atom). */
  pubDate?: string;
  /** Close/due date if present in the feed itself. */
  closeDate?: string;
  /** The source system's own notice reference number. */
  noticeId?: string;
  /** Issuing agency name if present in the feed. */
  agencyName?: string;
  /** Procurement category if present in the feed. */
  category?: string;
}

export interface TenderFeedSource {
  /** Unique stable ID — also used as connector ID suffix and board ID suffix. */
  id: string;
  /** Human-readable name shown in the UI. */
  name: string;
  /** Australian jurisdiction. */
  jurisdiction: FeedJurisdiction;
  /** Human-readable region label ("Commonwealth", "New South Wales", …). */
  region: string;
  /** Portal home page for display/linking. */
  portalUrl: string;
  /** RSS / Atom / API endpoint. */
  feedUrl: string;
  feedType: FeedType;
  /** Override field names when this feed uses non-standard RSS tags. */
  fieldMap?: FeedFieldMap;
  /**
   * Feed reliability.
   * - verified   → tested and live
   * - unverified → best-guess URL, not validated
   * - placeholder → portal exists but feed URL unknown
   */
  status: FeedStatus;
  /** Short note shown in the UI (e.g. "Free, no auth required"). */
  note?: string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const TENDER_FEED_REGISTRY: TenderFeedSource[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // Commonwealth
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "austender-cth",
    name: "AusTender",
    jurisdiction: "AU-CTH",
    region: "Commonwealth",
    portalUrl: "https://www.tenders.gov.au",
    feedUrl: "https://www.tenders.gov.au/public_data/rss/rss.xml",
    feedType: "rss",
    status: "verified",
    note: "Free, no auth required. ATM (approach to market) notices.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // New South Wales
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "etendering-nsw",
    name: "NSW eTendering",
    jurisdiction: "AU-NSW",
    region: "New South Wales",
    portalUrl: "https://tenders.nsw.gov.au",
    feedUrl: "https://tenders.nsw.gov.au/tenders?event=public.rss.list",
    feedType: "rss",
    status: "unverified",
    note: "NSW Government eTendering portal RSS.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Victoria
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "tenders-vic",
    name: "Tenders VIC",
    jurisdiction: "AU-VIC",
    region: "Victoria",
    portalUrl: "https://www.tenders.vic.gov.au",
    feedUrl: "https://www.tenders.vic.gov.au/tender/rss.php",
    feedType: "rss",
    status: "unverified",
    note: "Victorian Government tenders RSS.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Queensland
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "qtenders-qld",
    name: "QTenders",
    jurisdiction: "AU-QLD",
    region: "Queensland",
    portalUrl: "https://qtenders.epw.qld.gov.au",
    feedUrl: "https://qtenders.epw.qld.gov.au/qtenders/rss/rss.do",
    feedType: "rss",
    status: "unverified",
    note: "Queensland Government tenders RSS.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // South Australia
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "etendering-sa",
    name: "SAeTender",
    jurisdiction: "AU-SA",
    region: "South Australia",
    portalUrl: "https://www.tenders.sa.gov.au",
    feedUrl: "https://www.tenders.sa.gov.au/tenders/rss.do",
    feedType: "rss",
    status: "unverified",
    note: "South Australian Government eTendering RSS.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Western Australia
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "tenders-wa",
    name: "Tenders WA",
    jurisdiction: "AU-WA",
    region: "Western Australia",
    portalUrl: "https://www.tenders.wa.gov.au",
    feedUrl: "https://www.tenders.wa.gov.au/watenders/api/rss",
    feedType: "rss",
    status: "unverified",
    note: "Western Australian Government tenders RSS.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Tasmania
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "tenders-tas",
    name: "Tenders Tasmania",
    jurisdiction: "AU-TAS",
    region: "Tasmania",
    portalUrl: "https://www.tenders.tas.gov.au",
    feedUrl: "https://www.tenders.tas.gov.au/tenders/rss.do",
    feedType: "rss",
    status: "placeholder",
    note: "Tasmanian Government tenders — RSS URL unconfirmed.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Australian Capital Territory
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "tenders-act",
    name: "ACTenders",
    jurisdiction: "AU-ACT",
    region: "Australian Capital Territory",
    portalUrl: "https://www.tenders.act.gov.au",
    feedUrl: "https://www.tenders.act.gov.au/tenders/rss.do",
    feedType: "rss",
    status: "placeholder",
    note: "ACT Government tenders — RSS URL unconfirmed.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Northern Territory
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "tenders-nt",
    name: "NT Government Tenders",
    jurisdiction: "AU-NT",
    region: "Northern Territory",
    portalUrl: "https://www.nt.gov.au/industry/procurement",
    feedUrl: "https://www.nt.gov.au/industry/procurement/rss",
    feedType: "rss",
    status: "placeholder",
    note: "NT Government tenders — RSS URL unconfirmed.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Private aggregators
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "tenderlink",
    name: "TenderLink",
    jurisdiction: "AGGREGATOR",
    region: "National (aggregator)",
    portalUrl: "https://www.tenderlink.com",
    feedUrl: "https://www.tenderlink.com/rss/tenders.xml",
    feedType: "rss",
    status: "unverified",
    note: "Commercial aggregator — covers federal, state, and local government.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getFeedById(id: string): TenderFeedSource | undefined {
  return TENDER_FEED_REGISTRY.find((f) => f.id === id);
}

export function getVerifiedFeeds(): TenderFeedSource[] {
  return TENDER_FEED_REGISTRY.filter((f) => f.status === "verified");
}

export function getFeedsByJurisdiction(j: FeedJurisdiction): TenderFeedSource[] {
  return TENDER_FEED_REGISTRY.filter((f) => f.jurisdiction === j);
}

/** Derive a connector_sources.id from a feed registry entry. */
export function feedConnectorId(feedId: string): string {
  return `conn-feed-${feedId}`;
}

/** Derive a tender_boards.id from a feed registry entry. */
export function feedBoardId(feedId: string): string {
  return `tb-${feedId}`;
}
