import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // NOTE: This endpoint is normally invoked automatically via pg_cron or Supabase scheduling 
  // checking all active opportunities for new Addenda to download.
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch opportunities that are active and have a known source hook (simulated)
    const { data: opportunities, error } = await supabaseClient
      .from("opportunities")
      .select("id, tenant_id, source_id, status")
      .eq("status", "reviewing")
      .not("source_id", "is", null)
      .limit(10); // Batch limit for cron

    if (error) throw error;
    
    let processedCount = 0;

    // 2. Iterate and simulate scraping
    for (const opp of (opportunities || [])) {
      // IN PRODUCTION: We would fetch(opp.source_id) using an RSS parser or headless scraper
      // For MVP: Ensure we randomly detect a "new" document to simulate the monitor finding one.
      
      const hasNewAddendumOnPortal = Math.random() > 0.5; // Simulate a 50% hit chance
      if (hasNewAddendumOnPortal) {
        
        // Pseudo-download the addendum file from the portal
        const fauxContent = "Simulated Addendum 1: The due date has been extended by 3 weeks and Liability Insurance requirement dropped.";
        const filename = `addendum-simulated-${Date.now()}.txt`;
        const storagePath = `${opp.tenant_id}/${crypto.randomUUID()}-addendum.txt`;

        // Upload directly to Quarantine Vault so it undergoes virus scanning & extraction automatically
        await supabaseClient.storage
           .from("opportunity_documents")
           .upload(storagePath, fauxContent, { contentType: "text/plain" });
        
        // Log the document asset mapped to the opportunity, firing the webhook pipeline
        const { error: insertError } = await supabaseClient
           .from("document_assets")
           .insert({
             tenant_id: opp.tenant_id,
             opportunity_id: opp.id,
             storage_path: storagePath,
             original_filename: filename,
             size_bytes: fauxContent.length,
             scan_status: "pending",   // This triggers the scan-document function which later triggers ingest/evaluate
             metadata: { type: "addendum", source: "automated_monitor" }
           });

        if (!insertError) {
          processedCount++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, portals_checked: opportunities?.length || 0, new_addenda_found: processedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Monitor Portals Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
