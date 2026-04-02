import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

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

    // 2. Iterate and process AusTender opportunities autonomously
    for (const opp of (opportunities || [])) {
      if (!opp.source_id.startsWith("opp-austender-")) continue;
      
      const uuid = opp.source_id.replace("opp-austender-", "").trim();
      const url = `https://www.tenders.gov.au/Atm/Show/${uuid}`;

      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html"
          }
        });
        
        if (!res.ok) continue;

        const html = await res.text();
        const $ = cheerio.load(html);

        // Find all rows in potential Addenda tables
        const addendaRows = $("tr").filter((i, el) => {
          const text = $(el).text().toLowerCase();
          return text.includes("addend") || text.includes("amendment");
        });

        if (addendaRows.length > 0) {
           // We found an addendum mention on the AusTender page
           // Extract the text content as a robust summary since we can't reliably scrape binary PDFs without authenticated sessions
           const addendumText = addendaRows.first().text().replace(/\s+/g, ' ').trim();
           
           // Check if we already logged this addendum
           const hashStr = addendumText.substring(0, 32).replace(/[^a-zA-Z0-9]/g, '');
           const filename = `austender-addendum-${hashStr}.txt`;
           
           const { data: existingAsset } = await supabaseClient
             .from("document_assets")
             .select("id")
             .eq("opportunity_id", opp.id)
             .eq("original_filename", filename)
             .single();

           if (!existingAsset) {
             // It's a brand new addendum!
             const simulatedBinaryContent = `Automated AusTender Discovery:\nSource: ${url}\n\nAddendum Details Extracted from Portal:\n${addendumText}`;
             const storagePath = `${opp.tenant_id}/${crypto.randomUUID()}-addendum.txt`;

             await supabaseClient.storage
               .from("opportunity_documents")
               .upload(storagePath, simulatedBinaryContent, { contentType: "text/plain" });

             const { error: insertError } = await supabaseClient
               .from("document_assets")
               .insert({
                 tenant_id: opp.tenant_id,
                 opportunity_id: opp.id,
                 storage_path: storagePath,
                 original_filename: filename,
                 size_bytes: simulatedBinaryContent.length,
                 scan_status: "pending",   // Triggers evaluation
                 metadata: { type: "addendum", source: "austender", url }
               });

             if (!insertError) {
               processedCount++;
             }
           }
        }
      } catch (err) {
        console.error(`Failed to scan AusTender ID: ${uuid}`, err);
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
