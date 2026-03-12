import { AUSTENDER_RSS_URL } from "./catalog";

export interface AusTenderFeedItem {
  id: string;
  guid: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string;
  buyerName: string;
}

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string) {
  return decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function createAusTenderOpportunityId(guid: string, link: string) {
  const source = guid || link || crypto.randomUUID();
  const tail = source.split("/").filter(Boolean).pop() ?? source;
  return `opp-austender-${tail.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()}`;
}

function extractBuyerName(title: string, summary: string) {
  const patterns = [
    /(The\s+)?((?:Department|Dept|Services Australia|Australian [A-Z][A-Za-z0-9,&'()\- ]+|National [A-Z][A-Za-z0-9,&'()\- ]+|Bureau of Meteorology|Defence Housing Australia|Australian Taxation Office|Australian Federal Police)[A-Za-z0-9,&'()\- ]*)(?=\s+(?:is|are|seeks|seeking|requires|invites|has|will)\b)/i,
    /for\s+the\s+((?:Department|Dept|Australian [A-Z][A-Za-z0-9,&'()\- ]+|National [A-Z][A-Za-z0-9,&'()\- ]+|Bureau of Meteorology|Services Australia)[A-Za-z0-9,&'()\- ]*)(?=[.,;]|$)/i,
  ];

  for (const pattern of patterns) {
    const titleMatch = title.match(pattern);
    if (titleMatch?.[2] || titleMatch?.[1]) {
      return (titleMatch[2] ?? titleMatch[1])
        .replace(/\s+(is|are|seeks|seeking|requires|invites|has|will)$/i, "")
        .trim();
    }

    const summaryMatch = summary.match(pattern);
    if (summaryMatch?.[2] || summaryMatch?.[1]) {
      return (summaryMatch[2] ?? summaryMatch[1])
        .replace(/\s+(is|are|seeks|seeking|requires|invites|has|will)$/i, "")
        .trim();
    }
  }

  return "Australian Government buyer";
}

export function parseAusTenderRss(xml: string): AusTenderFeedItem[] {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
    .map((match) => match[1] ?? "")
    .map((itemXml) => {
      const title = stripHtml(extractTag(itemXml, "title"));
      const link = decodeEntities(extractTag(itemXml, "link"));
      const guid = decodeEntities(extractTag(itemXml, "guid")) || link;
      const summary = stripHtml(extractTag(itemXml, "description"));
      const publishedAt = decodeEntities(extractTag(itemXml, "pubDate"));

      return {
        id: createAusTenderOpportunityId(guid, link),
        guid,
        title,
        link,
        summary,
        publishedAt,
        buyerName: extractBuyerName(title, summary),
      };
    })
    .filter((item) => item.title && item.link);
}

export async function fetchAusTenderFeed(limit = 25) {
  const response = await fetch(AUSTENDER_RSS_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      Accept: "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-AU,en;q=0.9",
      Referer: "https://www.tenders.gov.au/",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    const looksLikeCloudFrontBlock =
      /cloudfront|request blocked|request could not be satisfied/i.test(errorBody);

    throw new Error(
      looksLikeCloudFrontBlock
        ? `AusTender RSS is currently blocking this server request (HTTP ${response.status} from CloudFront).`
        : `AusTender RSS request failed with status ${response.status}.`
    );
  }

  const xml = await response.text();
  if (!/<rss[\s>]/i.test(xml) && !/<feed[\s>]/i.test(xml)) {
    throw new Error("AusTender returned a non-RSS response.");
  }

  return parseAusTenderRss(xml).slice(0, limit);
}
