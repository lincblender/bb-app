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

    // Fetch the new Addendum
    const { data: asset, error: assetError } = await supabaseClient
      .from("document_assets")
      .select("*, opportunity:opportunities(*)")
      .eq("id", asset_id)
      .single();

    if (assetError || !asset) throw new Error("Asset not found");
    if (!asset.opportunity_id) throw new Error("Document is not linked to an opportunity");
    
    // We expect text extraction to have already happened
    const newText = asset.extracted_text || "Simulated mock extracted text payload representing an addendum.";
    const oppSummary = asset.opportunity.summary || "Base opportunity summary placeholder";
    const oppStatus = asset.opportunity.status;

    // Use OpenAI to compare delta
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    
    const prompt = `You are a procurement Intelligence Engine evaluating a newly uploaded Addendum against a Base Opportunity constraint.
Base Opportunity Context:
${oppSummary}

New Addendum Text:
${newText}

Determine if this Addendum introduces a MATERIAL SHIFT in the bidding strategy. 
A material shift could be: An extension of a due date, fundamentally changed scope, new mandatory compliance criteria, or cancelled opportunity.
Output your findings briefly (under 50 words) starting with either "MATERIAL SHIFT:" or "NON-MATERIAL:".`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 150,
    });

    const findings = response.choices[0]?.message?.content || "";
    
    // Create a notification for the user
    // We only create notifications for Material Shifts, or we just notify they arrived
    const isMaterial = findings.startsWith("MATERIAL SHIFT:");
    
    const notifPayload = {
      tenant_id: asset.tenant_id,
      type: "addendum_alert",
      title: isMaterial ? `Critical Addendum: ${asset.original_filename}` : `Addendum Logged: ${asset.original_filename}`,
      message: findings,
      action_data: { opportunity_id: asset.opportunity_id, asset_id: asset_id, is_material: isMaterial }
    };

    const { error: notifError } = await supabaseClient
      .from("notifications")
      .insert(notifPayload);

    if (notifError) {
      console.error("Failed to write notification", notifError);
    }

    // Set document as formally vetted/addendum evaluated
    await supabaseClient
      .from("document_assets")
      .update({ metadata: { ...asset.metadata, type: "addendum", evaluation: findings } })
      .eq("id", asset_id);

    return new Response(JSON.stringify({ success: true, findings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Evaluation Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
