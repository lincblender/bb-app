import { NextResponse } from "next/server";
import { fetchCurrentTenantId } from "@/lib/workspace/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bountyId = typeof body.bountyId === "string" ? body.bountyId : null;

    if (!bountyId) {
      return NextResponse.json({ error: "bountyId required" }, { status: 400 });
    }

    const tenantId = await fetchCurrentTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // 1. Validate the Bounty
    const { data: bounty, error: bountyError } = await supabase
      .from("marketplace_bounties")
      .select("id, bounty_amount, tenant_id")
      .eq("id", bountyId)
      .eq("status", "open")
      .single();

    if (bountyError || !bounty) {
      return NextResponse.json({ error: "Bounty not found or no longer open" }, { status: 404 });
    }

    // 2. Prevent self-matching
    if (bounty.tenant_id === tenantId) {
       return NextResponse.json({ error: "Cannot match your own bounty" }, { status: 400 });
    }

    // 3. Simulated Stripe Checkout Intent creation
    // In production, we'd use stripe.paymentIntents.create and stripe.checkout.sessions.create
    const dummyPaymentIntentId = `pi_simulated_${crypto.randomUUID()}`;
    const dummyCheckoutUrl = `https://checkout.stripe.com/pay/cs_test_${crypto.randomUUID()}`;

    // 4. Record the match locally
    const { error: matchError } = await supabase
      .from("marketplace_matches")
      .insert({
         bounty_id: bounty.id,
         sme_tenant_id: tenantId,
         stripe_payment_intent_id: dummyPaymentIntentId
      });

    if (matchError) {
       return NextResponse.json({ error: matchError.message }, { status: 500 });
    }

    // 5. Secure the Bounty (Lock it)
    await supabase.from("marketplace_bounties").update({ status: 'locked' }).eq("id", bounty.id);

    return NextResponse.json({ 
       success: true, 
       paymentIntentId: dummyPaymentIntentId,
       checkoutUrl: dummyCheckoutUrl
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to initialize Stripe checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
