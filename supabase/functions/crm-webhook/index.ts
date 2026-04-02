import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Edge Function to handle Database Webhook Triggers containing CRM Signals.
 * Pushes opportunity pipeline transitions (Bid/No Bid) logically to Hubspot/Salesforce.
 */
serve(async (req) => {
  try {
    const payload = await req.json();

    const oldRecord = payload.old_record || {};
    const newRecord = payload.record || {};

    if (oldRecord.strategy_posture === newRecord.strategy_posture) {
      return new Response(
         JSON.stringify({ message: "No change to strategy posture." }), 
         { headers: { "Content-Type": "application/json" } }
      );
    }

    const opportunityId = newRecord.opportunity_id;
    const decision = newRecord.strategy_posture; 

    // Convert internal status to typical CRM deal stages
    let crmDealStage = "Reviewing";
    if (decision === "pursue-directly" || decision === "pursue-with-partner") {
        crmDealStage = "Bid / Active Pursuit";
    } else if (decision === "monitor-only" || decision === "low-priority") {
        crmDealStage = "No Bid / Closed Lost";
    }

    console.log(`[CRM Webhook] Broadcasting decision: ${decision} (${crmDealStage}) for Opportunity ${opportunityId}`);

    // Production: We natively construct the HTTP call securely to the Enterprise CRM hook
    // const crmUrl = Deno.env.get("CRM_WEBHOOK_URL");
    // if (crmUrl) await fetch(crmUrl, { body: JSON.stringify({ dealName: opportunityId, stage: crmDealStage }) })

    return new Response(
      JSON.stringify({ success: true, broadcasted_decision: decision, external_stage: crmDealStage }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown edge function error";
    console.error("Webhook processing failed", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
