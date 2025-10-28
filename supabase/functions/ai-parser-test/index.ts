import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight request FIRST
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders,
        status: 200,
      });
    }

    // Dynamic imports to prevent initialization errors from blocking CORS
    const { parseResumeWithAI } = await import('../_utils/openaiProcessor.ts');
    const { processPdf } = await import('../_utils/pdfProcessor.ts');
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the request body
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

    // Fetch the file from the URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    let resumeText = '';

    // Extract text based on file type
    if (fileUrl.toLowerCase().endsWith('.pdf')) {
      console.log('Extracting text from PDF...');
      resumeText = await processPdf(new Uint8Array(fileBuffer));
    } else if (fileUrl.toLowerCase().endsWith('.docx')) {
      // For DOCX files, we'd need a different processor
      // For now, return an error
      return new Response(
        JSON.stringify({ error: 'DOCX parsing not yet implemented. Please use PDF files.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Please upload a PDF file.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not extract text from the file' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Extracted text length:', resumeText.length);
    console.log('Calling AI parser...');

    // Parse the resume text with AI
    const parsedData = await parseResumeWithAI(resumeText);

    console.log('AI parsing successful');

    // Return the parsed data
    return new Response(
      JSON.stringify({
        success: true,
        parsedData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing resume:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process resume',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});