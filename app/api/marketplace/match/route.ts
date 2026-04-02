import { NextResponse } from "next/server";
import { fetchCurrentTenantId } from "@/lib/workspace/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const capabilityGap = typeof body.capabilityGap === "string" ? body.capabilityGap : null;
    const opportunityId = typeof body.opportunityId === "string" ? body.opportunityId : null;

    if (!capabilityGap || !opportunityId) {
      return NextResponse.json({ error: "capabilityGap and opportunityId required" }, { status: 400 });
    }

    const tenantId = await fetchCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // In a real pgvector workflow, we would embed the capabilityGap string into a 1536 vector here 
    // using OpenAI Embeddings and do an <-> cosine distance search over a tenant_capabilities table. 
    // Since we're structurally mocking the marketplace inference pipeline:

    // 1. We mock the embedding fetch to pgvector (conceptually searching 'organisations' or an 'sme_capabilities' view)
    const mockMatches = [
      { id: `sme-${crypto.randomUUID()}`, name: "Defsec Defence Construction", match_score: 0.94, capability: "Secure Facility HVac Engineering" },
      { id: `sme-${crypto.randomUUID()}`, name: "Quantum Cyber Solutions", match_score: 0.82, capability: "Defense-grade Cyber Verification" }
    ];

    // 2. Automatically spool a Marketplace Bounty on behalf of the Prime Contractor
    const { error: bountyError, data: bounty } = await supabase
      .from("marketplace_bounties")
      .insert({
         tenant_id: tenantId,
         opportunity_id: opportunityId,
         capability_gap: capabilityGap,
         // capability_vector: [...],
         bounty_amount: 5000,
         status: "open"
      })
      .select("id")
      .single();

    if (bountyError) {
      return NextResponse.json({ error: bountyError.message }, { status: 500 });
    }

    return NextResponse.json({ 
       success: true, 
       bountyId: bounty.id,
       recommendedMatches: mockMatches
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to run marketplace search algorithm";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
