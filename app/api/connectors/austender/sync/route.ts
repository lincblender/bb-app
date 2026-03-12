import { NextResponse } from "next/server";
import { fetchAusTenderFeed } from "@/lib/connectors/austender";
import {
  CONNECTOR_IDS,
  CORE_TENDER_BOARDS,
  TENDER_BOARD_IDS,
  getCoreConnectorDefinition,
} from "@/lib/connectors/catalog";
import {
  createIntelligenceEvent,
  getAuthenticatedTenantContext,
  upsertConnectorSource,
  upsertTenderBoard,
} from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function createBuyerOrganisationId(name: string) {
  const slug = slugifySegment(name);
  return `buyer-austender-${slug || crypto.randomUUID()}`;
}

export async function POST() {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { supabase, tenantId } = context;
  const connector = getCoreConnectorDefinition(CONNECTOR_IDS.austender);
  const tenderBoard = CORE_TENDER_BOARDS.find((board) => board.id === TENDER_BOARD_IDS.austender);
  const importLimit =
    typeof connector?.config?.import_limit === "number" ? connector.config.import_limit : 25;

  try {
    const items = await fetchAusTenderFeed(importLimit);

    if (!tenderBoard) {
      throw new Error("AusTender board definition is missing.");
    }

    await upsertTenderBoard(supabase, tenantId, tenderBoard);

    const opportunityIds = items.map((item) => item.id);
    const buyerNames = Array.from(new Set(items.map((item) => item.buyerName)));

    const [{ data: existingOpportunities, error: existingOpportunitiesError }, { data: existingBuyers, error: existingBuyersError }] =
      await Promise.all([
        opportunityIds.length
          ? supabase.from("opportunities").select("id, status").in("id", opportunityIds)
          : Promise.resolve({ data: [], error: null }),
        buyerNames.length
          ? supabase
              .from("organisations")
              .select("id, name")
              .eq("type", "buyer")
              .in("name", buyerNames)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (existingOpportunitiesError) {
      throw existingOpportunitiesError;
    }

    if (existingBuyersError) {
      throw existingBuyersError;
    }

    const existingStatusByOpportunityId = new Map(
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
          name === "Australian Government buyer"
            ? "Buyer inferred from the official AusTender RSS feed."
            : "Buyer inferred from the official AusTender RSS feed and refined as more opportunity context is opened.",
        subsidiaries: [],
        acquisition_history: [],
      }));

    if (missingBuyers.length > 0) {
      const { error: insertBuyersError } = await supabase.from("organisations").upsert(
        missingBuyers,
        { onConflict: "id" }
      );

      if (insertBuyersError) {
        throw insertBuyersError;
      }

      missingBuyers.forEach((buyer) => {
        buyerIdByName.set(buyer.name, buyer.id);
      });
    }

    const opportunityRows = items.map((item) => ({
      id: item.id,
      tenant_id: tenantId,
      issuing_organisation_id: buyerIdByName.get(item.buyerName) ?? createBuyerOrganisationId(item.buyerName),
      title: item.title,
      category: "Government procurement",
      source_id: TENDER_BOARD_IDS.austender,
      due_date: null,
      summary: [item.summary, `Source: ${item.link}`].filter(Boolean).join("\n\n"),
      status: (existingStatusByOpportunityId.get(item.id) as
        | "new"
        | "reviewing"
        | "pursuing"
        | "monitoring"
        | "passed"
        | undefined) ?? "new",
    }));

    const { error: upsertOpportunitiesError } = await supabase
      .from("opportunities")
      .upsert(opportunityRows, { onConflict: "id" });

    if (upsertOpportunitiesError) {
      throw upsertOpportunitiesError;
    }

    await upsertConnectorSource(supabase, tenantId, {
      id: CONNECTOR_IDS.austender,
      status: "live",
      sourceType: "tender",
      config: {
        ...(connector?.config ?? {}),
        board_id: TENDER_BOARD_IDS.austender,
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
          ? "AusTender sync completed, but the RSS feed did not return any notices."
          : `AusTender sync imported ${items.length} current notices from the official RSS feed.`,
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
      id: CONNECTOR_IDS.austender,
      status: "manual",
      sourceType: "tender",
      config: {
        ...(connector?.config ?? {}),
        board_id: TENDER_BOARD_IDS.austender,
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
