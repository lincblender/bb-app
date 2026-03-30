/**
 * POST /api/connectors/austender/enrich/[id]
 *
 * Fetches the AusTender notice page for an existing opportunity and upgrades
 * its detail_level from "feed" to "opportunity".
 *
 * Enriches:
 *   - closes_at          (close date/time from the notice page)
 *   - procurement_type   (ATM / RFT / RFQ / EOI / CN)
 *   - category           (ICT / Professional services / etc.)
 *   - contact_name       (contact officer)
 *   - contact_email
 *   - value_min / value_max
 *   - notice_id          (the source system's own reference)
 *   - full summary text (if richer than the RSS snippet)
 *   - opportunity_addenda rows
 *   - opportunity_documents rows (title + URL — content is pulled at "detail" level)
 *   - issuing organisation ABN + agency_type
 */

import { NextRequest, NextResponse } from "next/server";
import { enrichAusTenderOpportunity } from "@/lib/connectors/austender-enrich";
import { getAuthenticatedTenantContext } from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id: opportunityId } = await params;
  const { supabase, tenantId } = context;

  // ── Load the existing opportunity ────────────────────────────────────────
  const { data: opportunity, error: oppError } = await supabase
    .from("opportunities")
    .select("id, source_url, detail_level, issuing_organisation_id, tenant_id")
    .eq("id", opportunityId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (oppError) {
    return NextResponse.json({ error: oppError.message }, { status: 500 });
  }

  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  if (!opportunity.source_url) {
    return NextResponse.json(
      { error: "This opportunity has no source URL to enrich from." },
      { status: 400 }
    );
  }

  // Already at opportunity or detail level — re-enrich allowed, just report it.
  const alreadyEnriched = opportunity.detail_level !== "feed";

  // ── Fetch and parse the notice page ─────────────────────────────────────
  let detail;
  try {
    detail = await enrichAusTenderOpportunity(opportunity.source_url as string);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch notice page." },
      { status: 502 }
    );
  }

  // ── Update the opportunity row ───────────────────────────────────────────
  const oppUpdate: Record<string, unknown> = {
    detail_level: "opportunity",
    updated_at: new Date().toISOString(),
  };

  if (detail.noticeId) oppUpdate.notice_id = detail.noticeId;
  if (detail.closesAt) {
    oppUpdate.closes_at = detail.closesAt;
    // Keep due_date aligned (DATE portion only)
    oppUpdate.due_date = detail.closesAt.split("T")[0];
  }
  if (detail.procurementType) oppUpdate.procurement_type = detail.procurementType;
  if (detail.category) oppUpdate.category = detail.category;
  if (detail.contactName) oppUpdate.contact_name = detail.contactName;
  if (detail.contactEmail) oppUpdate.contact_email = detail.contactEmail;
  if (detail.valueMin !== null) oppUpdate.value_min = detail.valueMin;
  if (detail.valueMax !== null) oppUpdate.value_max = detail.valueMax;
  if (detail.fullDescription) oppUpdate.summary = detail.fullDescription;

  const { error: updateOppError } = await supabase
    .from("opportunities")
    .update(oppUpdate)
    .eq("id", opportunityId)
    .eq("tenant_id", tenantId);

  if (updateOppError) {
    return NextResponse.json({ error: updateOppError.message }, { status: 500 });
  }

  // ── Enrich the issuing organisation (ABN, agency_type) ──────────────────
  if (detail.abn || detail.agencyName) {
    const orgUpdate: Record<string, unknown> = {};
    if (detail.abn) orgUpdate.abn = detail.abn;
    if (detail.agencyName) orgUpdate.name = detail.agencyName;

    await supabase
      .from("organisations")
      .update(orgUpdate)
      .eq("id", opportunity.issuing_organisation_id as string)
      .eq("tenant_id", tenantId)
      .then(() => undefined);
  }

  // ── Upsert addenda ───────────────────────────────────────────────────────
  let addendaCount = 0;
  if (detail.addenda.length > 0) {
    const addendaRows = detail.addenda.map((a, idx) => ({
      id: `addendum-${opportunityId}-${a.number ?? idx + 1}`,
      tenant_id: tenantId,
      opportunity_id: opportunityId,
      addendum_number: a.number ?? idx + 1,
      title: a.title,
      description: a.description ?? null,
      source_url: a.url ?? null,
      published_at: a.publishedAt ?? null,
    }));

    const { error: addendaError } = await supabase
      .from("opportunity_addenda")
      .upsert(addendaRows, { onConflict: "id" });

    if (addendaError) {
      // Non-fatal — log but continue
      console.error("Error upserting addenda:", addendaError.message);
    } else {
      addendaCount = addendaRows.length;
    }
  }

  // ── Upsert document listings (title + URL only — content at detail level) ──
  let documentCount = 0;
  if (detail.documents.length > 0) {
    const docRows = detail.documents.map((doc, idx) => ({
      id: `doc-${opportunityId}-${idx}`,
      tenant_id: tenantId,
      opportunity_id: opportunityId,
      title: doc.title,
      source_url: doc.url,
      file_type: doc.fileType ?? null,
    }));

    const { error: docError } = await supabase
      .from("opportunity_documents")
      .upsert(docRows, { onConflict: "id" });

    if (docError) {
      console.error("Error upserting documents:", docError.message);
    } else {
      documentCount = docRows.length;
    }
  }

  return NextResponse.json({
    opportunityId,
    alreadyEnriched,
    enriched: {
      noticeId: detail.noticeId,
      closesAt: detail.closesAt,
      procurementType: detail.procurementType,
      category: detail.category,
      contactName: detail.contactName,
      contactEmail: detail.contactEmail,
      valueMin: detail.valueMin,
      valueMax: detail.valueMax,
      abn: detail.abn,
      addendaCount,
      documentCount,
    },
  });
}
