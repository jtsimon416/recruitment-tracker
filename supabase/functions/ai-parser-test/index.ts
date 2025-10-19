import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_utils/cors.ts";
import { parseResumeWithAI } from "../_utils/openaiProcessor.ts";

serve(async (req) => {
  // Handle CORS pre-flight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Expect the raw resume text in the request body under the key 'resume_text'
    const { resume_text } = await req.json();

    if (!resume_text) {
      return new Response(JSON.stringify({ error: "Missing 'resume_text' in request body." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call the new AI parsing function
    const structuredData = await parseResumeWithAI(resume_text);

    // Return the structured JSON data for n8n or your front-end to process
    return new Response(JSON.stringify(structuredData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message || "An unknown error occurred during parsing." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});