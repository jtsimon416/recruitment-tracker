import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('Function invoked, method:', req.method);
  
  try {
    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      return new Response('ok', {
        headers: corsHeaders,
        status: 200,
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

    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing fileUrl in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Processing file:', fileUrl);

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let resumeText = decoder.decode(fileBuffer);
    
    resumeText = resumeText
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!resumeText || resumeText.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Could not extract sufficient text from file' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Extracted text length:', resumeText.length);

    return new Response(
      JSON.stringify({
        success: true,
        extractedText: resumeText.substring(0, 500),
        fullLength: resumeText.length,
        message: 'Text extraction successful. AI parsing temporarily disabled for testing.'
      }),
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