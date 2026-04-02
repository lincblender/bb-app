import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { asset_id } = await req.json();

    if (!asset_id) {
      throw new Error("Missing asset_id");
    }

    // 1. Fetch the asset record
    const { data: asset, error: assetError } = await supabaseClient
      .from("document_assets")
      .select("*")
      .eq("id", asset_id)
      .single();

    if (assetError || !asset) {
      throw new Error("Asset not found");
    }

    console.log(`Scanning asset: ${asset.original_filename} (${asset.storage_path})`);

    // 2. Mock Virus Scanning Logic
    // In production, we would download the file via:
    // const { data: file } = await supabaseClient.storage.from('opportunity_documents').download(asset.storage_path);
    // And send the file buffer to Cloudmersive or VirusTotal.

    // Here, we simulate a scan that fails if "malware" is in the filename.
    const isSafe = !asset.original_filename.toLowerCase().includes("malware");
    
    const newStatus = isSafe ? "safe" : "malicious";

    // 3. Update the scan status
    const { error: updateError } = await supabaseClient
      .from("document_assets")
      .update({ scan_status: newStatus })
      .eq("id", asset_id);

    if (updateError) throw updateError;

    // 4. If malicious, delete the file from the bucket to protect the tenant
    if (!isSafe) {
      console.warn(`[QUARANTINE] Malicious file detected. Deleting ${asset.storage_path}`);
      await supabaseClient.storage.from("opportunity_documents").remove([asset.storage_path]);
      
      return new Response(JSON.stringify({ status: "malicious", message: "File blocked by virus scan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`[QUARANTINE] File clean: ${asset.storage_path}`);

    // Optionally: invoke ingest-document immediately here, or let the client do it.
    // For reliability, we trigger ingestion now.
    
    // Fire and forget the ingestion process
    // supabaseClient.functions.invoke("ingest-document", { body: { asset_id } });

    return new Response(JSON.stringify({ status: "safe" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Scanner Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
