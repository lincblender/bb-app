import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "npm:openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("Missing OPENAI_API_KEY");
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing or invalid messages array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Format chat history into a readable timeline for the summariser
    const formattedHistory = messages.map((msg: any) => {
      let content = msg.content || "";
      if (msg.blocks && Array.isArray(msg.blocks)) {
        const textBlocks = msg.blocks.filter((b: any) => b.type === "text").map((b: any) => b.content);
        if (textBlocks.length > 0) {
          content += "\n" + textBlocks.join("\n");
        }
      }
      return `${msg.role.toUpperCase()}: ${content}`;
    }).join("\n\n");

    const systemPrompt = `You are a precision summarisation engine for a strategic B2B bidding platform. 
Your objective is to ingest the following raw conversation history and output a highly dense, factual summary recording all context, decisions made, opportunities evaluated, and strategy locked in.

Rules:
1. Do not use conversational filler (e.g., "The user asked...").
2. Focus strictly on facts: Opportunity IDs mentioned, the organisation's capabilities discussed, and any clear strategic postures decided (e.g., "Decided to pursue Project X because of strong incumbent ties").
3. Format the summary cleanly using bullet points to preserve tokens while maximising context retention for the main agent.
4. Prefix your output exactly with: "/// CONTEXT COMPRESSION CHUNK ///\n" so the orchestration engine can parse it natively.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // fast, cheap context processing
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the conversation history to compress:\n\n${formattedHistory}` }
      ],
      temperature: 0.1,
      max_tokens: 800,
    });

    const summaryText = response.choices[0]?.message?.content || "Failed to compress message history.";

    return new Response(
      JSON.stringify({ summaryText }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Summarisation Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
