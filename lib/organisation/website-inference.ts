/**
 * AI-powered company profile inference from a live website.
 *
 * Flow:
 *   1. Fetch the homepage + up to 3 key sub-pages (About, Services, etc.)
 *   2. Strip HTML and truncate to a safe token budget
 *   3. Call OpenAI (gpt-4o by default) with a procurement-focused prompt
 *   4. Return a structured WebsiteInferredProfile
 *
 * Unlike organisation-ai-populate (which web-searches for the company),
 * this reads the company's OWN website content directly — so the inferences
 * are grounded in exactly what the company says about itself.
 */

import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnspscCode {
  /** 8-digit UNSPSC commodity code, e.g. "43230000" */
  code: string;
  /** Human description, e.g. "Software" */
  description: string;
  /** Was this directly stated on the site, or AI-inferred? */
  confidence: "stated" | "inferred";
}

export interface GovernmentPanel {
  /** Full panel name, e.g. "Digital Marketplace" */
  name: string;
  /** "Federal" | "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT" */
  jurisdiction: string;
  /** "confirmed" = site explicitly mentions it; "likely" = AI inference */
  status: "confirmed" | "likely";
}

export interface InferredCapability {
  name: string;
  category: string;
  confidence: "stated" | "inferred";
}

export interface WebsiteInferredProfile {
  // Core profile fields (compatible with OrganisationProfileSaveInput)
  description: string;
  location: string;
  sectors: string[];
  capabilities: InferredCapability[];
  certifications: Array<{ name: string; issuer: string }>;
  individualQualifications: Array<{ name: string; issuer: string; count: number; holderNames: string[] }>;
  caseStudies: Array<{ title: string; client: string; outcome: string }>;
  strategicPreferences: string[];
  targetMarkets: string[];
  partnerGaps: string[];

  // Procurement intelligence — the wow factor
  unspscCodes: UnspscCode[];
  anzsicCode: string | null;
  governmentPanels: GovernmentPanel[];
  operatingRegions: string[];
  tenderKeywords: string[];

  // Inference metadata
  pagesAnalysed: string[];
  dataQuality: "rich" | "moderate" | "limited";
}

// ---------------------------------------------------------------------------
// Website scraping
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 8_000;
const MAX_CHARS_PER_PAGE = 5_000;
const MAX_TOTAL_CHARS = 16_000;

const KEY_PAGE_PATTERNS: Array<{ label: string; paths: string[] }> = [
  { label: "About", paths: ["/about", "/about-us", "/who-we-are", "/our-story", "/company"] },
  { label: "Services", paths: ["/services", "/what-we-do", "/solutions", "/offerings"] },
  { label: "Products", paths: ["/products", "/platform", "/software", "/technology"] },
  { label: "Capabilities", paths: ["/capabilities", "/expertise", "/specialisations", "/specialties"] },
  { label: "Government", paths: ["/government", "/public-sector", "/defence"] },
  { label: "Portfolio", paths: ["/case-studies", "/work", "/portfolio", "/projects", "/clients"] },
];

function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("No website URL provided.");
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProto).href;
}

function extractTextFromHtml(html: string): string {
  let text = html
    // Remove non-content blocks
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Keep block-level structure
    .replace(/<\/(p|h[1-6]|li|dd|dt|tr|section|article|header|main)>/gi, "\n")
    // Drop all remaining tags
    .replace(/<[^>]+>/g, " ")
    // Decode common entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

  // Collapse whitespace
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findSubpageUrls(html: string, origin: string): Array<{ url: string; label: string }> {
  const found: Array<{ url: string; label: string }> = [];
  const hrefRegex = /href="([^"#?][^"]*?)"/gi;
  const seenPaths = new Set<string>();
  let match: RegExpExecArray | null;

  const hrefs: string[] = [];
  while ((match = hrefRegex.exec(html)) !== null) {
    hrefs.push(match[1]);
  }

  for (const { label, paths } of KEY_PAGE_PATTERNS) {
    if (found.length >= 4) break;
    for (const path of paths) {
      const candidate = hrefs.find((href) => {
        try {
          const resolved = new URL(href, origin);
          if (resolved.origin !== origin) return false;
          const pn = resolved.pathname.toLowerCase().replace(/\/$/, "");
          return pn === path || pn.startsWith(path + "/") || pn.startsWith(path + "-");
        } catch {
          return false;
        }
      });

      if (candidate) {
        try {
          const resolved = new URL(candidate, origin);
          const pn = resolved.pathname;
          if (!seenPaths.has(pn)) {
            seenPaths.add(pn);
            found.push({ url: resolved.href, label });
          }
        } catch {
          // ignore
        }
        break;
      }
    }
  }

  return found;
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BidBlender/1.0; +https://bidblender.com.au)",
        Accept: "text/html,application/xhtml+xml",
      },
    }).finally(() => clearTimeout(timer));

    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;

    const html = await res.text();
    const text = extractTextFromHtml(html);
    return text.slice(0, MAX_CHARS_PER_PAGE);
  } catch {
    return null;
  }
}

export interface ScrapedWebsite {
  pages: Array<{ label: string; url: string; text: string }>;
  totalChars: number;
}

export async function scrapeWebsite(rawUrl: string): Promise<ScrapedWebsite> {
  const baseUrl = normaliseUrl(rawUrl);
  const origin = new URL(baseUrl).origin;
  const pages: Array<{ label: string; url: string; text: string }> = [];

  // Fetch homepage
  const homepageHtml = await (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(baseUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BidBlender/1.0; +https://bidblender.com.au)",
          Accept: "text/html,application/xhtml+xml",
        },
      }).finally(() => clearTimeout(timer));
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  })();

  if (!homepageHtml) {
    throw new Error("Could not fetch the website. Check the URL and try again.");
  }

  const homepageText = extractTextFromHtml(homepageHtml).slice(0, MAX_CHARS_PER_PAGE);
  pages.push({ label: "Homepage", url: baseUrl, text: homepageText });

  // Find and fetch subpages in parallel
  const subpageLinks = findSubpageUrls(homepageHtml, origin).slice(0, 4);
  const subpageResults = await Promise.all(
    subpageLinks.map(async ({ url, label }) => {
      const text = await fetchPageText(url);
      return text ? { label, url, text } : null;
    })
  );

  for (const result of subpageResults) {
    if (result) pages.push(result);
  }

  const totalChars = pages.reduce((n, p) => n + p.text.length, 0);
  return { pages, totalChars };
}

// ---------------------------------------------------------------------------
// OpenAI inference
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "gpt-4o";
const OUTPUT_TOKENS = 2_500;
const INFERENCE_TIMEOUT_MS = 60_000;

function getInferenceModel(): string {
  return (
    process.env.OPENAI_MODEL_WEBSITE_INFERENCE?.trim() ||
    process.env.OPENAI_MODEL_DEEP?.trim() ||
    DEFAULT_MODEL
  );
}

const INFERENCE_SYSTEM_PROMPT = `You are a specialist in Australian government procurement intelligence.

Given raw text scraped from a company's own website, your job is to build a comprehensive government tender profile — focusing on exactly what this company could credibly bid for.

OUTPUT REQUIREMENTS:

description (string):
  2–3 sentence procurement-focused summary. Describe what the company does and the value it provides to government buyers. Max 400 characters. Plain English, no marketing fluff.

capabilities (array):
  Each capability must have: name (string), category (string), confidence ("stated"|"inferred").
  - "stated" = the company explicitly claims this on their site.
  - "inferred" = you are inferring it from context (e.g. they mention clients in healthcare, so you infer "Healthcare IT").
  Procurement-relevant phrasing only. Not "innovative solutions" — yes "Cloud Migration", "Application Development", "Managed Security Services".
  Max 8.

unspscCodes (array):
  Assign 3–6 most relevant 8-digit UNSPSC codes. Each: code (string), description (string), confidence ("stated"|"inferred").
  These are the commodity codes that would appear in government tender specifications for what this company sells.
  Be precise. Common Australian examples:
    43230000 Software / 43232000 Application software / 43231500 Educational/reference software
    81112000 Engineering services / 81101500 Internet services
    80100000 Management advisory services / 80101500 Business administration services
    80120000 Information technology consultation services / 80111500 Quality assurance consulting
    86000000 Education and training services / 86130000 Professional development training
    72100000 Building construction / 72110000 Residential building construction
    85100000 Comprehensive medical services
    95000000 Land and Real Estate Services
  Do NOT assign vague parent codes (43000000) when specific children apply.

anzsicCode (string | null):
  Single most relevant ANZSIC 2006 code in format "XXXX — Description". Examples:
    "6209 — Other Computer Services"
    "6920 — Management Consulting Services"
    "6311 — Electronic Information Storage Services"
    "7000 — Property Services"
    "8401 — Preschool Education"
    "8601 — Hospitals"
  Return null if genuinely uncertain.

governmentPanels (array):
  Only include panels with strong evidence. Each: name (string), jurisdiction (string), status ("confirmed"|"likely").
  - "confirmed" = the company explicitly mentions this panel on their site.
  - "likely" = their described capabilities align well with a known panel.
  Jurisdiction values: "Federal" | "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT" | "National"
  Well-known Australian panels:
    Digital Marketplace / ICT Labour Hire (Federal, DITRDCA)
    NSW Government IT Services Panel (NSW)
    NSW Talent Acquisition Framework (NSW)
    Queensland Government ICT standing offer arrangements (QLD)
    SA Government ICT Common Use Contract (SA)
    WA ICT Standing Offer (WA)
    Victorian Government Technology suppliers (VIC)
  Max 4 entries.

operatingRegions (array of strings):
  Where does this company operate? Use: "ACT" | "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "NT" | "National" | "International"
  Infer from office locations, client mentions, delivery language.
  Max 6.

tenderKeywords (array of strings):
  15–25 precise keyword phrases that procurement officers would use in tender specifications when looking for companies like this.
  Examples: "cloud migration", "cyber security uplift", "platform engineering", "managed detection and response", "ICT strategy", "workforce management system".
  These must be SPECIFIC — not generic words like "technology" or "services".

sectors (array of strings):
  Max 5 sectors from: Government, Defence, Health, Education, Finance, Utilities, Transport, Resources, Agriculture, Retail, Not-for-profit.
  Only include sectors where there is actual evidence.

certifications (array):
  Organisation-level certifications: name (string), issuer (string). E.g. ISO 27001 (ISO), IRAP assessed (ACSC). Max 4.

individualQualifications (array):
  Person-level qualifications: name (string), issuer (string), count (number, default 1), holderNames (array, default []).
  E.g. CISSP, AWS Certified Solutions Architect. Max 4.

caseStudies (array):
  title (string), client (string, can be "Government agency" if unnamed), outcome (string). Max 3.
  Only include if the website describes actual project work.

strategicPreferences (array of strings):
  How does this company prefer to win government business? E.g. "Subcontracting to prime contractors", "Panel-only procurement", "Innovation partnerships". Max 4.

targetMarkets (array of strings):
  Specific government market segments. E.g. "Federal government agencies", "State government health departments". Max 5.

partnerGaps (array of strings):
  What partner capabilities does this company need to win larger government contracts? E.g. "Hardware supply", "Change management". Max 3.

location (string):
  Primary city/state. E.g. "Canberra, ACT" or "Sydney, NSW". Empty string if not determinable.

dataQuality ("rich" | "moderate" | "limited"):
  - "rich": 3+ pages with substantive content about services, clients, capabilities
  - "moderate": homepage + 1–2 pages with some useful content
  - "limited": limited content, generic descriptions only

pagesAnalysed (array of strings):
  List of page labels you were given, e.g. ["Homepage", "About", "Services"].

Be conservative: if you cannot determine a field with confidence, return an empty array or null. Do not invent.
`;

const INFERENCE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "description", "location", "sectors", "capabilities", "certifications",
    "individualQualifications", "caseStudies", "strategicPreferences",
    "targetMarkets", "partnerGaps",
    "unspscCodes", "anzsicCode", "governmentPanels", "operatingRegions",
    "tenderKeywords", "pagesAnalysed", "dataQuality",
  ],
  properties: {
    description: { type: "string" },
    location: { type: "string" },
    sectors: { type: "array", items: { type: "string" } },
    capabilities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "category", "confidence"],
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          confidence: { type: "string", enum: ["stated", "inferred"] },
        },
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "issuer"],
        properties: { name: { type: "string" }, issuer: { type: "string" } },
      },
    },
    individualQualifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "issuer", "count", "holderNames"],
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          count: { type: "number" },
          holderNames: { type: "array", items: { type: "string" } },
        },
      },
    },
    caseStudies: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "client", "outcome"],
        properties: {
          title: { type: "string" },
          client: { type: "string" },
          outcome: { type: "string" },
        },
      },
    },
    strategicPreferences: { type: "array", items: { type: "string" } },
    targetMarkets: { type: "array", items: { type: "string" } },
    partnerGaps: { type: "array", items: { type: "string" } },
    unspscCodes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "description", "confidence"],
        properties: {
          code: { type: "string" },
          description: { type: "string" },
          confidence: { type: "string", enum: ["stated", "inferred"] },
        },
      },
    },
    anzsicCode: { type: ["string", "null"] },
    governmentPanels: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "jurisdiction", "status"],
        properties: {
          name: { type: "string" },
          jurisdiction: { type: "string" },
          status: { type: "string", enum: ["confirmed", "likely"] },
        },
      },
    },
    operatingRegions: { type: "array", items: { type: "string" } },
    tenderKeywords: { type: "array", items: { type: "string" } },
    pagesAnalysed: { type: "array", items: { type: "string" } },
    dataQuality: { type: "string", enum: ["rich", "moderate", "limited"] },
  },
} as const;

export async function inferProfileFromWebsite(
  scraped: ScrapedWebsite
): Promise<WebsiteInferredProfile> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const openai = new OpenAI({ apiKey });
  const model = getInferenceModel();

  // Build the user content: combine all page texts with labels
  let combined = scraped.pages
    .map((p) => `=== ${p.label.toUpperCase()} (${p.url}) ===\n${p.text}`)
    .join("\n\n");

  if (combined.length > MAX_TOTAL_CHARS) {
    combined = combined.slice(0, MAX_TOTAL_CHARS) + "\n[truncated]";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INFERENCE_TIMEOUT_MS);

  try {
    const response = await openai.responses.create(
      {
        model,
        instructions: INFERENCE_SYSTEM_PROMPT,
        input: `Analyse this website content and return the procurement profile JSON:\n\n${combined}`,
        max_output_tokens: OUTPUT_TOKENS,
        text: {
          format: {
            type: "json_schema",
            name: "website_inferred_profile",
            strict: true,
            schema: INFERENCE_JSON_SCHEMA,
          },
        },
      },
      { signal: controller.signal }
    );

    const raw = response.output_text;
    if (!raw) throw new Error("OpenAI returned an empty response.");

    const parsed = JSON.parse(raw) as WebsiteInferredProfile;
    // Ensure pagesAnalysed reflects what we actually scraped
    parsed.pagesAnalysed = scraped.pages.map((p) => p.label);
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}
