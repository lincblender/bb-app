import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { asset_id } = await req.json();
    if (!asset_id) throw new Error("Missing asset_id");

    const { data: asset, error: assetError } = await supabaseClient
      .from("document_assets")
      .select("*")
      .eq("id", asset_id)
      .single();

    if (assetError || !asset) throw new Error("Asset not found");
    if (asset.scan_status !== "safe") {
      throw new Error(`Cannot ingest document that is not marked safe. Status is: ${asset.scan_status}`);
    }

    console.log(`Starting ingestion for ${asset.original_filename}...`);

    // 1. Download file from Storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from("opportunity_documents")
      .download(asset.storage_path);

    if (downloadError) throw downloadError;

    // 2. Extract Text
    // Very rudimentary extraction stub. Real extraction needs `pdf-parse` or similar for PDFs.
    let textContent = "";
    if (asset.original_filename.endsWith(".txt")) {
      textContent = await fileData.text();
    } else {
      // Stub for PDF/DOCX
      textContent = `Simulated extraction for ${asset.original_filename}. This represents thousands of tokens of dense procurement clauses and SOW requirements.`;
    }

    // 3. Update original document with extracted full text (optional for caching)
    await supabaseClient
      .from("document_assets")
      .update({ extracted_text: textContent.slice(0, 1000) + "..." }) // Store snippet or full text
      .eq("id", asset_id);

    // 4. Chunk text manually
    // Simplistic chunking by sentence or length
    const chunks = textContent.match(/.{1,1000}(\\s|$)/g) || [textContent];

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    // 5. Generate Embeddings & Insert
    // For large documents, we should batch these using Promise.all or batched API calls
    const insertPayload = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      if (!chunkText.trim()) continue;

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunkText,
      });

      insertPayload.push({
        document_id: asset_id,
        tenant_id: asset.tenant_id,
        opportunity_id: asset.opportunity_id,
        chunk_index: i,
        content: chunkText,
        embedding: response.data[0].embedding,
      });
    }

    // 6. Bulk Insert
    if (insertPayload.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("document_chunks")
        .insert(insertPayload);

      if (insertError) throw insertError;
    }

    console.log(`Ingestion complete! Embedded ${insertPayload.length} chunks.`);

    return new Response(JSON.stringify({ success: true, chunks: insertPayload.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Ingestion Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
