import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept, accept-language, accept-encoding',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

Deno.serve(async (req) => {
  console.log('=== Function invoked ===-');
  console.log('Method:', req.method);
  
  try {
    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS/preflight request');
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json();
    const { resumeText } = body;

    if (!resumeText) {
      return new Response(
        JSON.stringify({ error: 'Missing resumeText in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Received resumeText length:', resumeText.length);
    console.log("Resume Text (first 500 chars):", resumeText.substring(0, 500));

    // No need to fetch file or decode text, as it's already provided as plain text
    // The previous text cleaning was for binary data, which is no longer necessary

    const prompt = `
      You are an expert resume parser. Extract the following information from the resume text provided below.
      - Name
      - Email
      - Phone
      - Location
      - LinkedIn Profile URL
      - Skills (as a comma-separated list)
      - Summary (a brief summary of the candidate's experience)

      Your response MUST be a valid JSON object with the following keys: "name", "email", "phone", "location", "linkedin_url", "skills", "summary".

      If you cannot find a value for a key, use an empty string "".

      If you cannot parse the resume at all, return the following JSON object:
      {
        "name": "",
        "email": "",
        "phone": "",
        "location": "",
        "linkedin_url": "",
        "skills": "",
        "summary": "Could not parse resume."
      }

      Resume Text:
      ${resumeText}
    `;

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(`Gemini API request failed: ${geminiResponse.statusText} - ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();

    // --- Defensive parsing of Gemini response ---
    const parsedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!parsedText) {
      console.error("Invalid Gemini Response Structure:", JSON.stringify(geminiData, null, 2));
      throw new Error("Failed to extract parsable text from Gemini response.");
    }
    // --- End of defensive parsing ---

    const parsedData = JSON.parse(parsedText.replace(/\`\`\`json|\`\`\`/g, '').trim());

    return new Response(
      JSON.stringify({ parsedData }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process request',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});