/**
 * Generic tender feed parser.
 *
 * Handles RSS 2.0 and Atom 1.0 feeds.  Per-feed quirks (different tag names,
 * CDATA wrapping, entity encoding) are normalised via the FeedFieldMap from
 * the feed registry so callers always get the same TenderFeedItem shape.
 */

import type { FeedFieldMap, FeedType, TenderFeedSource } from "./feed-registry";

// ---------------------------------------------------------------------------
// Output type — a normalised item from any tender feed.
// ---------------------------------------------------------------------------

export interface TenderFeedItem {
  /** Globally unique ID used as the BidBlender opportunity ID (stable across re-syncs). */
  id: string;
  /** The source system's own notice/guid reference (e.g. AusTender ATM URL). */
  guid: string;
  title: string;
  /** Direct link to the notice on the source portal. */
  link: string;
  /** Short summary / description from the feed. */
  summary: string;
  /** ISO string from pubDate / updated — may be empty. */
  publishedAt: string;
  /** Close / due date from the feed itself, if available (ISO string or raw). */
  closeDate: string | null;
  /** Issuing agency name extracted from the feed item or derived from feed metadata. */
  buyerName: string;
  /** Source feed registry ID (e.g. "austender-cth"). */
  feedId: string;
  /** Which feed connector (connector_sources.id) this came from. */
  connectorId: string;
  /** Which tender board (tender_boards.id) this came from. */
  boardId: string;
}

// ---------------------------------------------------------------------------
// XML helpers (same approach as the original austender.ts)
// ---------------------------------------------------------------------------

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripHtml(value: string): string {
  return decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

/** Extract the href from <link href="..." /> (Atom self-link style). */
function extractAtomLink(block: string): string {
  // Prefer <link rel="alternate" href="..."> or just <link href="...">
  const alternate = block.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i);
  if (alternate?.[1]) return alternate[1];
  const anyHref = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (anyHref?.[1]) return anyHref[1];
  // Fallback: text content of <link>...</link>
  return decodeEntities(extractTag(block, "link"));
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function createOpportunityId(feedId: string, guid: string, link: string): string {
  const source = guid || link || crypto.randomUUID();
  const tail = source.split(/[/?#]/).filter(Boolean).pop() ?? source;
  const slug = tail.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase().slice(0, 48);
  return `opp-${feedId}-${slug}`;
}

// ---------------------------------------------------------------------------
// Buyer name extraction (retained from original austender.ts, made generic)
// ---------------------------------------------------------------------------

const AU_GOV_PATTERNS = [
  /(The\s+)?((?:Department(?:\s+of)?|Dept|Services Australia|Australian [A-Z][A-Za-z0-9,&'()\- ]+|National [A-Z][A-Za-z0-9,&'()\- ]+|Bureau of Meteorology|Defence Housing Australia|Australian Taxation Office|Australian Federal Police)[A-Za-z0-9,&'()\- ]*)(?=\s+(?:is|are|seeks|seeking|requires|invites|has|will)\b)/i,
  /for\s+the\s+((?:Department(?:\s+of)?|Dept|Australian [A-Z][A-Za-z0-9,&'()\- ]+|National [A-Z][A-Za-z0-9,&'()\- ]+|Bureau of Meteorology|Services Australia)[A-Za-z0-9,&'()\- ]*)(?=[.,;]|$)/i,
];

function extractBuyerName(title: string, summary: string, feedRegion: string): string {
  for (const pattern of AU_GOV_PATTERNS) {
    for (const text of [title, summary]) {
      const m = text.match(pattern);
      const name = m?.[2] ?? m?.[1];
      if (name) {
        return name.replace(/\s+(is|are|seeks|seeking|requires|invites|has|will)$/i, "").trim();
      }
    }
  }
  return `${feedRegion} Government buyer`;
}

// ---------------------------------------------------------------------------
// Core parser
// ---------------------------------------------------------------------------

/**
 * Detect whether the XML is RSS or Atom so we can choose default tags.
 */
function detectFeedType(xml: string): FeedType {
  if (/<feed[\s>]/i.test(xml)) return "atom";
  return "rss";
}

function resolveFieldMap(xml: string, overrides?: FeedFieldMap): Required<FeedFieldMap> {
  const detected = detectFeedType(xml);
  const defaults: Required<FeedFieldMap> =
    detected === "atom"
      ? {
          item: "entry",
          title: "title",
          link: "__atom_link__", // special handling in extractLink
          guid: "id",
          description: "summary",
          pubDate: "updated",
          closeDate: "",
          noticeId: "",
          agencyName: "",
          category: "category",
        }
      : {
          item: "item",
          title: "title",
          link: "link",
          guid: "guid",
          description: "description",
          pubDate: "pubDate",
          closeDate: "",
          noticeId: "",
          agencyName: "",
          category: "category",
        };

  return { ...defaults, ...(overrides ?? {}) };
}

function extractLink(itemXml: string, map: Required<FeedFieldMap>): string {
  if (map.link === "__atom_link__") {
    return extractAtomLink(itemXml);
  }
  return decodeEntities(extractTag(itemXml, map.link));
}

/**
 * Parse an XML string (RSS or Atom) into normalised TenderFeedItem[].
 */
export function parseTenderFeed(
  xml: string,
  feed: Pick<TenderFeedSource, "id" | "region" | "fieldMap">,
  connectorId: string,
  boardId: string
): TenderFeedItem[] {
  const map = resolveFieldMap(xml, feed.fieldMap);
  const itemTag = map.item;

  const rawItems = Array.from(
    xml.matchAll(new RegExp(`<${itemTag}[\\s>]([\\s\\S]*?)<\\/${itemTag}>`, "gi"))
  ).map((m) => m[1] ?? "");

  return rawItems
    .map((itemXml): TenderFeedItem => {
      const title = stripHtml(extractTag(itemXml, map.title));
      const link = extractLink(itemXml, map);
      const guid = decodeEntities(extractTag(itemXml, map.guid)) || link;
      const summary = stripHtml(extractTag(itemXml, map.description));
      const publishedAt = decodeEntities(extractTag(itemXml, map.pubDate));
      const closeDate = map.closeDate
        ? (decodeEntities(extractTag(itemXml, map.closeDate)) || null)
        : null;
      const agencyFromFeed = map.agencyName
        ? stripHtml(extractTag(itemXml, map.agencyName))
        : "";

      return {
        id: createOpportunityId(feed.id, guid, link),
        guid,
        title,
        link,
        summary,
        publishedAt,
        closeDate,
        buyerName: agencyFromFeed || extractBuyerName(title, summary, feed.region),
        feedId: feed.id,
        connectorId,
        boardId,
      };
    })
    .filter((item) => item.title && item.link);
}

// ---------------------------------------------------------------------------
// Fetch + parse
// ---------------------------------------------------------------------------

export async function fetchTenderFeed(
  feed: TenderFeedSource,
  connectorId: string,
  boardId: string,
  limit = 25
): Promise<TenderFeedItem[]> {
  const response = await fetch(feed.feedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BidBlender/1.0; +https://bidblender.com)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      "Accept-Language": "en-AU,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const blocked = /cloudfront|request blocked|request could not be satisfied|access denied/i.test(body);
    throw new Error(
      blocked
        ? `${feed.name} RSS is currently blocking this server request. Try again later.`
        : `${feed.name} RSS request failed with status ${response.status}.`
    );
  }

  const xml = await response.text();

  if (!/<rss[\s>]/i.test(xml) && !/<feed[\s>]/i.test(xml) && !/<channel[\s>]/i.test(xml)) {
    throw new Error(`${feed.name} returned a non-RSS/Atom response.`);
  }

  return parseTenderFeed(xml, feed, connectorId, boardId).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Custom feed (user-provided URL, no registry entry needed)
// ---------------------------------------------------------------------------

export interface CustomFeedConfig {
  feedUrl: string;
  feedId: string;
  feedName: string;
  region?: string;
  fieldMap?: FeedFieldMap;
  connectorId: string;
  boardId: string;
}

export async function fetchCustomFeed(
  config: CustomFeedConfig,
  limit = 25
): Promise<TenderFeedItem[]> {
  const response = await fetch(config.feedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BidBlender/1.0; +https://bidblender.com)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      "Accept-Language": "en-AU,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Custom feed "${config.feedName}" returned HTTP ${response.status}.`
    );
  }

  const xml = await response.text();

  if (!/<rss[\s>]/i.test(xml) && !/<feed[\s>]/i.test(xml) && !/<channel[\s>]/i.test(xml)) {
    throw new Error(`Custom feed "${config.feedName}" did not return a valid RSS/Atom document.`);
  }

  const pseudoFeed = {
    id: config.feedId,
    region: config.region ?? "Custom",
    fieldMap: config.fieldMap,
  };

  return parseTenderFeed(xml, pseudoFeed, config.connectorId, config.boardId).slice(0, limit);
}
