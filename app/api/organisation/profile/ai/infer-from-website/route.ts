/**
 * POST /api/organisation/profile/ai/infer-from-website
 *
 * Scrapes the provided website URL, then calls OpenAI to infer a full
 * government-procurement-focused organisation profile including UNSPSC codes,
 * ANZSIC classification, likely government panel memberships, operating
 * regions, and tender keywords.
 *
 * Body:
 *   { websiteUrl: string }
 *
 * Response:
 *   { profile: WebsiteInferredProfile } | { error: string }
 */

import { NextResponse } from "next/server";
import { getAuthenticatedTenantContext } from "@/lib/connectors/server";
import { scrapeWebsite, inferProfileFromWebsite } from "@/lib/organisation/website-inference";

export const dynamic = "force-dynamic";

// Long timeout — website fetch + OpenAI can take ~30s
export const maxDuration = 90;

export async function POST(request: Request) {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let websiteUrl: string;
  try {
    const body = (await request.json()) as { websiteUrl?: unknown };
    if (typeof body.websiteUrl !== "string" || !body.websiteUrl.trim()) {
      return NextResponse.json(
        { error: "Provide a websiteUrl in the request body." },
        { status: 400 }
      );
    }
    websiteUrl = body.websiteUrl.trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const scraped = await scrapeWebsite(websiteUrl);
    const profile = await inferProfileFromWebsite(scraped);
    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Profile inference failed. Please try again.";

    // Surface scraping failures separately from AI failures
    const isScrapeError =
      message.toLowerCase().includes("fetch") ||
      message.toLowerCase().includes("url") ||
      message.toLowerCase().includes("could not");

    return NextResponse.json({ error: message }, { status: isScrapeError ? 400 : 500 });
  }
}
