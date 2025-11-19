import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

serve(async (req) => {
  console.log('Function invoked.');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json();
    const action = requestBody.action || 'analyze_resume'; // Default to existing behavior

    let prompt = '';

    if (action === 'generate_boolean_search') {
      const { role, location, skills } = requestBody;

      if (!role) {
        throw new Error('Role is required for Boolean search generation.');
      }

      console.log(`Generating Boolean search for Role: ${role}, Location: ${location}, Skills: ${skills}`);

      prompt = `
        You are an expert Technical Recruiter and Sourcing Specialist. Your task is to generate three tiered LinkedIn Boolean search strings for the following role:
        
        Role: ${role}
        Location: ${location || 'Remote/Any'}
        Extra Skills/Keywords: ${skills || 'None'}

        Create three distinct search strings:
        1. **Unicorn (Top 5%)**: Highly specific, targeting top-tier candidates with niche skills and titles.
        2. **Strong (Top 20%)**: Balanced, capturing qualified candidates with core skills.
        3. **Acceptable (Top 50%)**: Broader, capturing a wider pool of potentially relevant candidates.

        For each tier, provide:
        - "search": The exact Boolean search string.
        - "explanation": A brief explanation of why this string is effective and what it targets.

        Your output MUST be a valid JSON object with the following structure:
        {
          "unicorn": { "search": "...", "explanation": "..." },
          "strong": { "search": "...", "explanation": "..." },
          "acceptable": { "search": "...", "explanation": "..." }
        }
      `;

    } else {
      // --- EXISTING RESUME ANALYSIS LOGIC ---
      const { resumeText, jobDescriptionText } = requestBody;

      if (!resumeText || !jobDescriptionText) {
        throw new Error('resumeText and jobDescriptionText are required for resume analysis.');
      }

      console.log('Analyzing resume...');

      prompt = `
        You are Hire Logic AI, a top-level, unbiased Hiring Manager. Your task is to analyze a candidate's resume against a specific job description and provide a detailed fit assessment.
        Focus ONLY on hard skills and qualifications explicitly present in the resume and job description. IGNORE soft skills, personality traits, or anything not directly verifiable from the provided texts.
        Your output MUST be a JSON object with the following structure:
        {
          "score": <numerical score from 1-100>,
          "strengths": "<bulleted list of candidate's strengths based on the job description>",
          "weaknesses": "<bulleted list of candidate's weaknesses/gaps based on the job description>",
          "assessment": "<brief overall summary of the candidate's fit>"
        }

        --- JOB DESCRIPTION ---
        ${jobDescriptionText}

        --- CANDIDATE RESUME ---
        ${resumeText}

        --- ANALYSIS ---
        Provide your analysis as a JSON object as specified above. Ensure the JSON is valid and complete.
      `;
    }

    const maxRetries = 4;
    let attempt = 0;
    let geminiResponse;
    let lastError = null;

    while (attempt < maxRetries) {
      try {
        geminiResponse = await fetch(GEMINI_API_URL, {
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
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        });

        if (geminiResponse.ok) {
          lastError = null;
          break;
        } else {
          const errorBody = await geminiResponse.text();
          throw new Error(`Gemini API request failed: ${geminiResponse.statusText} - ${errorBody}`);
        }
      } catch (error) {
        lastError = error;
        attempt++;
        if (attempt >= maxRetries) throw lastError;
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      throw new Error('Failed to get a successful response from Gemini API.');
    }

    const geminiData = await geminiResponse.json();
    const resultText = geminiData.candidates[0].content.parts[0].text;
    const parsedResult = JSON.parse(resultText);

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
