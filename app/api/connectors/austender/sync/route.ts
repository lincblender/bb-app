import { NextResponse } from "next/server";
import { CONNECTOR_IDS, CORE_TENDER_BOARDS, getCoreConnectorDefinition } from "@/lib/connectors/catalog";
import { getFeedById, feedConnectorId, feedBoardId } from "@/lib/connectors/feed-registry";
import { fetchTenderFeed } from "@/lib/connectors/tender-feed";
import {
  createIntelligenceEvent,
  getAuthenticatedTenantContext,
  upsertConnectorSource,
  upsertTenderBoard,
} from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

const FEED_ID = "austender-cth";
const CONNECTOR_ID = CONNECTOR_IDS.austender; // "conn-feed-austender-cth"
const BOARD_ID = feedBoardId(FEED_ID);         // "tb-austender-cth"

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function createBuyerOrganisationId(name: string) {
  const slug = slugifySegment(name);
  return `buyer-${FEED_ID}-${slug || crypto.randomUUID()}`;
}

export async function POST() {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { supabase, tenantId } = context;
  const feed = getFeedById(FEED_ID);
  const connector = getCoreConnectorDefinition(CONNECTOR_ID);
  const tenderBoard = CORE_TENDER_BOARDS.find((b) => b.id === BOARD_ID);
  const importLimit =
    typeof connector?.config?.import_limit === "number" ? connector.config.import_limit : 25;

  if (!feed) {
    return NextResponse.json({ error: "AusTender feed definition not found." }, { status: 500 });
  }

  try {
    const items = await fetchTenderFeed(feed, CONNECTOR_ID, BOARD_ID, importLimit);

    if (tenderBoard) {
      await upsertTenderBoard(supabase, tenantId, tenderBoard);
    }

    // Also upsert the legacy board ID for backward compat with existing opportunity rows.
    await upsertTenderBoard(supabase, tenantId, {
      id: "tb-austender",
      name: "AusTender (legacy)",
      description: "Alias kept for backward compatibility.",
      region: "AU-CTH",
    });

    const opportunityIds = items.map((item) => item.id);
    const buyerNames = Array.from(new Set(items.map((item) => item.buyerName)));

    const [{ data: existingOpportunities, error: existingOpportunitiesError }, { data: existingBuyers, error: existingBuyersError }] =
      await Promise.all([
        opportunityIds.length
          ? supabase.from("opportunities").select("id, status").in("id", opportunityIds)
          : Promise.resolve({ data: [], error: null }),
        buyerNames.length
          ? supabase.from("organisations").select("id, name").eq("type", "buyer").in("name", buyerNames)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (existingOpportunitiesError) throw existingOpportunitiesError;
    if (existingBuyersError) throw existingBuyersError;

    const existingStatusById = new Map(
      (existingOpportunities ?? []).map((row) => [row.id as string, row.status as string])
    );
    const buyerIdByName = new Map(
      (existingBuyers ?? []).map((row) => [row.name as string, row.id as string])
    );

    const missingBuyers = buyerNames
      .filter((name) => !buyerIdByName.has(name))
      .map((name) => ({
        id: createBuyerOrganisationId(name),
        tenant_id: tenantId,
        type: "buyer",
        name,
        description:
          name === "Commonwealth Government buyer" || name.includes("Government buyer")
            ? "Buyer inferred from the official AusTender RSS feed."
            : "Buyer inferred from the official AusTender RSS feed. Enriched contact and ABN data is pulled when the notice is opened.",
        subsidiaries: [],
        acquisition_history: [],
      }));

    if (missingBuyers.length > 0) {
      const { error: insertBuyersError } = await supabase
        .from("organisations")
        .upsert(missingBuyers, { onConflict: "id" });
      if (insertBuyersError) throw insertBuyersError;
      missingBuyers.forEach((b) => buyerIdByName.set(b.name, b.id));
    }

    const opportunityRows = items.map((item) => ({
      id: item.id,
      tenant_id: tenantId,
      issuing_organisation_id:
        buyerIdByName.get(item.buyerName) ?? createBuyerOrganisationId(item.buyerName),
      title: item.title,
      category: "Government procurement",
      source_id: BOARD_ID,
      due_date: null,
      summary: item.summary || null,
      status: (existingStatusById.get(item.id) as
        | "new"
        | "reviewing"
        | "pursuing"
        | "monitoring"
        | "passed"
        | undefined) ?? "new",
      // New enrichment columns (feed-level only at this point)
      source_url: item.link,
      guid: item.guid,
      published_at: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
      closes_at: item.closeDate ? new Date(item.closeDate).toISOString() : null,
      feed_id: item.feedId,
      detail_level: "feed",
    }));

    const { error: upsertError } = await supabase
      .from("opportunities")
      .upsert(opportunityRows, { onConflict: "id" });
    if (upsertError) throw upsertError;

    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_ID,
      status: "live",
      sourceType: "tender",
      config: {
        ...(connector?.config ?? {}),
        board_id: BOARD_ID,
        last_synced_at: new Date().toISOString(),
        import_limit: importLimit,
        last_imported_count: items.length,
        latest_notice_title: items[0]?.title ?? null,
        latest_notice_guid: items[0]?.guid ?? null,
      },
    });

    await createIntelligenceEvent(supabase, tenantId, {
      type: "opportunity_imported",
      description:
        items.length === 0
          ? "AusTender sync completed — no new notices in the RSS feed."
          : `AusTender sync imported ${items.length} current notices from the Commonwealth RSS feed.`,
    });

    return NextResponse.json({
      importedCount: items.length,
      opportunities: items.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        buyerName: item.buyerName,
        publishedAt: item.publishedAt,
        link: item.link,
      })),
    });
  } catch (error) {
    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_ID,
      status: "manual",
      sourceType: "tender",
      config: {
        ...(connector?.config ?? {}),
        board_id: BOARD_ID,
        last_error:
          error instanceof Error ? error.message : "AusTender sync failed for an unknown reason.",
        last_failed_at: new Date().toISOString(),
      },
    }).catch(() => undefined);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "AusTender sync failed for an unknown reason.",
      },
      { status: 500 }
    );
  }
}
