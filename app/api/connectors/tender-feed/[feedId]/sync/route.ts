/**
 * Generic tender feed sync.
 *
 * POST /api/connectors/tender-feed/[feedId]/sync
 *
 * Works for any feed registered in TENDER_FEED_REGISTRY as well as custom feeds
 * stored in connector_sources (sourceType = "tender", config.feed_url set).
 *
 * Body (optional JSON):
 *   { limit?: number }   — override import_limit for this call
 */

import { NextRequest, NextResponse } from "next/server";
import { CORE_TENDER_BOARDS, getCoreConnectorDefinition } from "@/lib/connectors/catalog";
import {
  TENDER_FEED_REGISTRY,
  getFeedById,
  feedConnectorId,
  feedBoardId,
  type TenderFeedSource,
} from "@/lib/connectors/feed-registry";
import { fetchTenderFeed, fetchCustomFeed } from "@/lib/connectors/tender-feed";
import {
  createIntelligenceEvent,
  getAuthenticatedTenantContext,
  parseJsonRecord,
  upsertConnectorSource,
  upsertTenderBoard,
} from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function buyerOrgId(feedId: string, name: string) {
  return `buyer-${feedId}-${slugify(name) || crypto.randomUUID()}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> }
) {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { feedId } = await params;
  const { supabase, tenantId } = context;

  let body: { limit?: number } = {};
  try {
    body = (await request.json()) as { limit?: number };
  } catch {
    // empty body is fine
  }

  const connectorId = feedConnectorId(feedId);
  const boardId = feedBoardId(feedId);
  const catalogConnector = getCoreConnectorDefinition(connectorId);

  // ── Resolve feed source ───────────────────────────────────────────────────
  // 1. Check registry (built-in feeds)
  // 2. Fall back to connector_sources (custom user-added feeds)

  let feed: TenderFeedSource | null = getFeedById(feedId) ?? null;
  let isCustom = false;

  if (!feed) {
    // Look for a custom connector stored in the DB
    const { data: storedConnector } = await supabase
      .from("connector_sources")
      .select("config, name")
      .eq("id", connectorId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!storedConnector) {
      return NextResponse.json(
        { error: `Feed "${feedId}" not found in registry or your saved connectors.` },
        { status: 404 }
      );
    }

    const config = parseJsonRecord(storedConnector.config);
    if (typeof config.feed_url !== "string") {
      return NextResponse.json(
        { error: `Custom feed "${feedId}" has no feed_url configured.` },
        { status: 400 }
      );
    }

    // Synthesise a feed object from the stored config
    feed = {
      id: feedId,
      name: storedConnector.name as string,
      jurisdiction: "CUSTOM",
      region: (config.region as string) ?? "Custom",
      portalUrl: (config.portal_url as string) ?? config.feed_url as string,
      feedUrl: config.feed_url as string,
      feedType: ((config.feed_type as string) ?? "rss") as TenderFeedSource["feedType"],
      status: "unverified",
    };
    isCustom = true;
  }

  const importLimit = body.limit
    ?? (typeof catalogConnector?.config?.import_limit === "number" ? catalogConnector.config.import_limit : 25);

  // ── Ensure tender board exists ────────────────────────────────────────────
  const tenderBoard = CORE_TENDER_BOARDS.find((b) => b.id === boardId) ?? {
    id: boardId,
    name: feed.name,
    description: `${feed.region} tenders via ${feed.feedType.toUpperCase()} feed.`,
    region: feed.jurisdiction,
  };

  try {
    await upsertTenderBoard(supabase, tenantId, tenderBoard);

    // ── Fetch items ────────────────────────────────────────────────────────
    const items = isCustom
      ? await fetchCustomFeed(
          {
            feedUrl: feed.feedUrl,
            feedId,
            feedName: feed.name,
            region: feed.region,
            connectorId,
            boardId,
          },
          importLimit
        )
      : await fetchTenderFeed(feed, connectorId, boardId, importLimit);

    // ── Upsert buyer organisations ─────────────────────────────────────────
    const opportunityIds = items.map((i) => i.id);
    const buyerNames = Array.from(new Set(items.map((i) => i.buyerName)));

    const [{ data: existingOpps, error: oppErr }, { data: existingBuyers, error: buyerErr }] =
      await Promise.all([
        opportunityIds.length
          ? supabase.from("opportunities").select("id, status").in("id", opportunityIds)
          : Promise.resolve({ data: [], error: null }),
        buyerNames.length
          ? supabase.from("organisations").select("id, name").eq("type", "buyer").in("name", buyerNames)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (oppErr) throw oppErr;
    if (buyerErr) throw buyerErr;

    const existingStatusById = new Map(
      (existingOpps ?? []).map((r) => [r.id as string, r.status as string])
    );
    const buyerIdByName = new Map(
      (existingBuyers ?? []).map((r) => [r.name as string, r.id as string])
    );

    const missingBuyers = buyerNames
      .filter((n) => !buyerIdByName.has(n))
      .map((n) => ({
        id: buyerOrgId(feedId, n),
        tenant_id: tenantId,
        type: "buyer",
        name: n,
        description: `Buyer inferred from the ${feed!.name} feed.`,
        subsidiaries: [],
        acquisition_history: [],
      }));

    if (missingBuyers.length > 0) {
      const { error: buyerInsertErr } = await supabase
        .from("organisations")
        .upsert(missingBuyers, { onConflict: "id" });
      if (buyerInsertErr) throw buyerInsertErr;
      missingBuyers.forEach((b) => buyerIdByName.set(b.name, b.id));
    }

    // ── Upsert opportunities ───────────────────────────────────────────────
    const opportunityRows = items.map((item) => ({
      id: item.id,
      tenant_id: tenantId,
      issuing_organisation_id:
        buyerIdByName.get(item.buyerName) ?? buyerOrgId(feedId, item.buyerName),
      title: item.title,
      category: "Government procurement",
      source_id: boardId,
      due_date: null,
      summary: item.summary || null,
      status: (existingStatusById.get(item.id) as
        | "new"
        | "reviewing"
        | "pursuing"
        | "monitoring"
        | "passed"
        | undefined) ?? "new",
      source_url: item.link,
      published_at: item.publishedAt ? (() => { try { return new Date(item.publishedAt).toISOString(); } catch { return null; } })() : null,
      closes_at: item.closeDate ? (() => { try { return new Date(item.closeDate).toISOString(); } catch { return null; } })() : null,
      feed_id: feedId,
      detail_level: "feed",
    }));

    const { error: upsertErr } = await supabase
      .from("opportunities")
      .upsert(opportunityRows, { onConflict: "id" });
    if (upsertErr) throw upsertErr;

    // ── Update connector source ────────────────────────────────────────────
    await upsertConnectorSource(supabase, tenantId, {
      id: connectorId,
      status: "live",
      sourceType: "tender",
      name: feed.name,
      config: {
        ...(catalogConnector?.config ?? {}),
        feed_id: feedId,
        feed_url: feed.feedUrl,
        board_id: boardId,
        last_synced_at: new Date().toISOString(),
        import_limit: importLimit,
        last_imported_count: items.length,
        latest_notice_title: items[0]?.title ?? null,
        is_custom: isCustom,
      },
    });

    await createIntelligenceEvent(supabase, tenantId, {
      type: "opportunity_imported",
      description:
        items.length === 0
          ? `${feed.name} sync completed — no new notices returned.`
          : `${feed.name} sync imported ${items.length} notices.`,
    });

    return NextResponse.json({
      feedId,
      feedName: feed.name,
      importedCount: items.length,
      opportunities: items.slice(0, 5).map((i) => ({
        id: i.id,
        title: i.title,
        buyerName: i.buyerName,
        publishedAt: i.publishedAt,
        link: i.link,
      })),
    });
  } catch (error) {
    await upsertConnectorSource(supabase, tenantId, {
      id: connectorId,
      status: "manual",
      sourceType: "tender",
      name: feed.name,
      config: {
        ...(catalogConnector?.config ?? {}),
        feed_id: feedId,
        board_id: boardId,
        last_error:
          error instanceof Error ? error.message : "Feed sync failed for an unknown reason.",
        last_failed_at: new Date().toISOString(),
      },
    }).catch(() => undefined);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Feed sync failed for an unknown reason.",
      },
      { status: 500 }
    );
  }
}
