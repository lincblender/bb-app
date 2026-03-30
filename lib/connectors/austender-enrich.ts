/**
 * AusTender opportunity-level enrichment.
 *
 * Fetches the HTML notice page for an ATM opportunity and extracts:
 *   - Close date & time
 *   - Procurement type (ATM / RFT / RFQ / CN / EOI / …)
 *   - Category
 *   - Contact officer name + email
 *   - Estimated value range
 *   - ABN of the issuing agency
 *   - Document listing (title + URL — for the "detail" gathering level)
 *   - Addenda listing (title, date, URL)
 *
 * All extraction uses regex against the raw HTML so there is no DOM parser
 * dependency and the approach stays consistent with the RSS parser.
 * Patterns are resilient to whitespace / attribute variation.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AusTender notice URLs follow these patterns:
 *   https://www.tenders.gov.au/Atm/ShowSelectForView?AtmId=<id>
 *   https://www.tenders.gov.au/atm/show/<id>
 * The link field in the RSS item points to one of these.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface AusTenderNoticeDetail {
  /** AusTender's own ATM reference ID (e.g. "FINANCE-123456"). */
  noticeId: string | null;
  /** ISO date-time string for close date, or null. */
  closesAt: string | null;
  /** e.g. "ATM", "RFT", "RFQ", "EOI", "CN". */
  procurementType: string | null;
  /** e.g. "Information and Communication Technology". */
  category: string | null;
  /** Full-text description extracted from the notice body. */
  fullDescription: string | null;
  /** Issuing agency name (may be more precise than the RSS buyer extraction). */
  agencyName: string | null;
  /** Agency ABN. */
  abn: string | null;
  /** Contact officer display name. */
  contactName: string | null;
  /** Contact officer email. */
  contactEmail: string | null;
  /** Estimated minimum value in AUD (integer dollars). */
  valueMin: number | null;
  /** Estimated maximum value in AUD (integer dollars). */
  valueMax: number | null;
  documents: AusTenderDocument[];
  addenda: AusTenderAddendum[];
}

export interface AusTenderDocument {
  title: string;
  url: string;
  fileType: string | null;
}

export interface AusTenderAddendum {
  number: number | null;
  title: string;
  description: string | null;
  url: string | null;
  publishedAt: string | null;
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value: string): string {
  return decode(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract the <td> or <dd> value that follows a <th> or <dt> matching label.
 * Handles both table-based and definition-list layouts.
 */
function extractLabelledValue(html: string, label: string): string | null {
  // Table layout: <th>...label...</th>\s*<td>...value...</td>
  const tablePattern = new RegExp(
    `<t[hd][^>]*>[^<]*${label}[^<]*</t[hd]>\\s*<td[^>]*>([\\s\\S]*?)</td>`,
    "i"
  );
  const tableMatch = html.match(tablePattern);
  if (tableMatch?.[1]) return stripTags(tableMatch[1]);

  // DL layout: <dt>...label...</dt>\s*<dd>...value...</dd>
  const dlPattern = new RegExp(
    `<dt[^>]*>[^<]*${label}[^<]*</dt>\\s*<dd[^>]*>([\\s\\S]*?)</dd>`,
    "i"
  );
  const dlMatch = html.match(dlPattern);
  if (dlMatch?.[1]) return stripTags(dlMatch[1]);

  // Span layout: <span class="label">label</span><span class="value">value</span>
  const spanPattern = new RegExp(
    `<[^>]+>[^<]*${label}[^<]*</[^>]+>\\s*<[^>]+>([^<]+)</[^>]+>`,
    "i"
  );
  const spanMatch = html.match(spanPattern);
  if (spanMatch?.[1]) return stripTags(spanMatch[1]);

  return null;
}

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

function extractNoticeId(html: string): string | null {
  return (
    extractLabelledValue(html, "ATM ID") ??
    extractLabelledValue(html, "Notice ID") ??
    extractLabelledValue(html, "Reference") ??
    html.match(/atm[_-]?id[=:]\s*([A-Z0-9-]+)/i)?.[1] ??
    null
  );
}

function extractClosesAt(html: string): string | null {
  const raw =
    extractLabelledValue(html, "Close Date") ??
    extractLabelledValue(html, "Closing Date") ??
    extractLabelledValue(html, "Due Date") ??
    null;

  if (!raw) return null;

  // AusTender format: "17-Apr-2026 2:00 PM (ACT Local Time)"
  // Try to parse into ISO; if we can't, return raw string for the caller to handle.
  const iso = parseAusTenderDate(raw);
  return iso ?? raw;
}

/**
 * Parse AusTender date format "17-Apr-2026 2:00 PM (ACT Local Time)" into ISO UTC.
 * ACT uses AEST/AEDT (UTC+10/+11).  We approximate with +11 (AEDT) in daylight saving
 * months and +10 otherwise.  Callers store this as TIMESTAMPTZ so exact offset is secondary.
 */
function parseAusTenderDate(raw: string): string | null {
  const m = raw.match(
    /(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i
  );
  if (!m) return null;

  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const day = parseInt(m[1], 10);
  const month = months[m[2].toLowerCase()];
  const year = parseInt(m[3], 10);
  let hours = parseInt(m[4], 10);
  const minutes = parseInt(m[5], 10);
  const ampm = m[6]?.toUpperCase();

  if (month === undefined) return null;

  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  // Approximate AEDT offset (+11). A full implementation would use a tz library.
  const date = new Date(Date.UTC(year, month, day, hours - 11, minutes));
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function extractProcurementType(html: string): string | null {
  const raw =
    extractLabelledValue(html, "Type") ??
    extractLabelledValue(html, "Notice Type") ??
    extractLabelledValue(html, "Procurement Type") ??
    null;

  if (raw) return raw;

  // Infer from page title or badge
  const typeMatch = html.match(/\b(ATM|RFT|RFQ|EOI|CN|RFP|LOTE)\b/);
  return typeMatch?.[1] ?? null;
}

function extractCategory(html: string): string | null {
  return (
    extractLabelledValue(html, "Category") ??
    extractLabelledValue(html, "Procurement Category") ??
    null
  );
}

function extractAgencyName(html: string): string | null {
  return (
    extractLabelledValue(html, "Agency") ??
    extractLabelledValue(html, "Department") ??
    extractLabelledValue(html, "Issuing Entity") ??
    null
  );
}

function extractAbn(html: string): string | null {
  const raw =
    extractLabelledValue(html, "ABN") ??
    html.match(/ABN[:\s]+(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i)?.[1] ??
    null;

  if (!raw) return null;
  // Normalise to 11-digit no-spaces format
  return raw.replace(/\s+/g, "");
}

function extractContact(html: string): { name: string | null; email: string | null } {
  const name =
    extractLabelledValue(html, "Contact Officer") ??
    extractLabelledValue(html, "Contact Name") ??
    null;

  const emailRaw =
    extractLabelledValue(html, "Contact Email") ??
    extractLabelledValue(html, "Email") ??
    null;

  // Also try mailto links in the contact section
  const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
  const email = emailRaw ?? mailtoMatch?.[1] ?? null;

  return { name, email };
}

/**
 * Parse estimated value like "$50,000 to $100,000" → [50000, 100000].
 * Also handles single values, "up to $X", "from $X".
 */
function extractValueRange(html: string): { min: number | null; max: number | null } {
  const raw =
    extractLabelledValue(html, "Estimated Value") ??
    extractLabelledValue(html, "Contract Value") ??
    extractLabelledValue(html, "Value") ??
    null;

  if (!raw) return { min: null, max: null };

  const dollarAmounts = [...raw.matchAll(/\$?([\d,]+(?:\.\d+)?)\s*(?:million|m\b)?/gi)].map(
    (m) => {
      const val = parseFloat(m[1].replace(/,/g, ""));
      const isMillions = /million|m\b/i.test(m[0]);
      return Math.round(val * (isMillions ? 1_000_000 : 1));
    }
  );

  if (dollarAmounts.length === 0) return { min: null, max: null };
  if (dollarAmounts.length === 1) {
    const upTo = /up to|maximum|less than/i.test(raw);
    const fromLabel = /from|minimum|at least/i.test(raw);
    return {
      min: fromLabel ? dollarAmounts[0] : null,
      max: upTo ? dollarAmounts[0] : null,
    };
  }
  return { min: Math.min(...dollarAmounts), max: Math.max(...dollarAmounts) };
}

function extractFullDescription(html: string): string | null {
  // Look for a div/section with id or class hinting at description content
  const patterns = [
    /<div[^>]+(?:id|class)=["'][^"']*(?:description|details?|summary|overview)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]+(?:id|class)=["'][^"']*(?:description|details?|summary|overview)[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
    // AusTender sometimes uses a plain <p> block after the detail table
    /<p[^>]*class=["'][^"']*(?:description|summary)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const text = stripTags(m[1]);
      if (text.length > 50) return text.slice(0, 2000);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Document extraction
// ---------------------------------------------------------------------------

const DOCUMENT_EXTENSIONS = /\.(pdf|docx?|xlsx?|pptx?|zip|rtf|txt|csv|odt|ods|png|jpg|jpeg)$/i;

function extractDocuments(html: string, baseUrl: string): AusTenderDocument[] {
  // Find document section - look for a table or list near "documents" heading
  const docSectionMatch = html.match(
    /(?:<h[2-4][^>]*>[^<]*[Dd]ocuments?[^<]*<\/h[2-4]>|[Dd]ocuments?\s*<\/[a-z]+>)([\s\S]*?)(?=<h[2-4]|<\/(?:section|div|main)|$)/i
  );
  const docSection = docSectionMatch?.[1] ?? html;

  const docs: AusTenderDocument[] = [];
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = linkPattern.exec(docSection)) !== null) {
    const href = decode(match[1]);
    const label = stripTags(match[2]);

    // Only include links that look like document downloads
    if (!href || (!DOCUMENT_EXTENSIONS.test(href) && !href.includes("/download") && !href.includes("/document"))) {
      continue;
    }

    const absoluteUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
    const ext = href.match(DOCUMENT_EXTENSIONS)?.[1]?.toUpperCase() ?? null;

    docs.push({ title: (label || href.split("/").pop()) ?? "Document", url: absoluteUrl, fileType: ext });
  }

  return docs;
}

// ---------------------------------------------------------------------------
// Addenda extraction
// ---------------------------------------------------------------------------

function extractAddenda(html: string, baseUrl: string): AusTenderAddendum[] {
  const addendaSectionMatch = html.match(
    /(?:<h[2-4][^>]*>[^<]*[Aa]ddend[au][^<]*<\/h[2-4]>|[Aa]ddend[au]\s*<\/[a-z]+>)([\s\S]*?)(?=<h[2-4]|<\/(?:section|div|main)|$)/i
  );

  if (!addendaSectionMatch) return [];

  const section = addendaSectionMatch[1];
  const addenda: AusTenderAddendum[] = [];

  // Try table rows first
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(section)) !== null) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1]));
    if (cells.length < 2) continue;

    const numberMatch = cells[0]?.match(/\d+/);
    const linkMatch = row.match(/href=["']([^"']+)["']/i);
    const url = linkMatch ? (linkMatch[1].startsWith("http") ? linkMatch[1] : new URL(linkMatch[1], baseUrl).toString()) : null;

    addenda.push({
      number: numberMatch ? parseInt(numberMatch[0], 10) : addenda.length + 1,
      title: cells[1] ?? cells[0] ?? `Addendum ${addenda.length + 1}`,
      description: cells[2] ?? null,
      url,
      publishedAt: parseAusTenderDate(cells[cells.length - 1] ?? "") ?? cells[cells.length - 1] ?? null,
    });
  }

  return addenda;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch an AusTender notice page and return structured enrichment data.
 *
 * @param noticeUrl - The direct URL to the ATM/RFT/CN notice page.
 */
export async function enrichAusTenderOpportunity(
  noticeUrl: string
): Promise<AusTenderNoticeDetail> {
  const response = await fetch(noticeUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BidBlender/1.0; +https://bidblender.com)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-AU,en;q=0.9",
      Referer: "https://www.tenders.gov.au/",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `AusTender notice page returned HTTP ${response.status} for ${noticeUrl}.`
    );
  }

  const html = await response.text();

  if (/<html[\s>]/i.test(html) === false) {
    throw new Error("AusTender did not return an HTML page.");
  }

  const { name: contactName, email: contactEmail } = extractContact(html);
  const { min: valueMin, max: valueMax } = extractValueRange(html);
  const baseUrl = new URL(noticeUrl).origin;

  return {
    noticeId: extractNoticeId(html),
    closesAt: extractClosesAt(html),
    procurementType: extractProcurementType(html),
    category: extractCategory(html),
    fullDescription: extractFullDescription(html),
    agencyName: extractAgencyName(html),
    abn: extractAbn(html),
    contactName,
    contactEmail,
    valueMin,
    valueMax,
    documents: extractDocuments(html, baseUrl),
    addenda: extractAddenda(html, baseUrl),
  };
}
