import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

serve(async (req) => {
  console.log('Function invoked.'); // Very early log

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let resumeText;
  let jobDescriptionText;
  try {
    const requestBody = await req.json();
    resumeText = requestBody.resumeText;
    jobDescriptionText = requestBody.jobDescriptionText;
    console.log('Received resumeText (partial):', resumeText ? resumeText.substring(0, 100) + '...' : 'N/A');
    console.log('Received jobDescriptionText (partial):', jobDescriptionText ? jobDescriptionText.substring(0, 100) + '...' : 'N/A');

    if (!resumeText || !jobDescriptionText) {
      console.error('Error: resumeText and jobDescriptionText are required in request body.');
      throw new Error('resumeText and jobDescriptionText are required.')
    }
  } catch (jsonError) {
    console.error('Error parsing request JSON or missing userQuestion:', jsonError);
    return new Response(JSON.stringify({ error: `Invalid request body: ${jsonError.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
        })
      }
    
      try {
        const prompt = `
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
        `
    
        let geminiResponse;
        let lastError = null;
        const maxRetries = 4;
        let attempt = 0;
    
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
                  responseMimeType: "application/json", // Instruct Gemini to return JSON
                },
              }),
            });
    
            if (geminiResponse.ok) {
              lastError = null; // Clear error on success
              break; // Exit loop on success
            } else {
              const errorBody = await geminiResponse.text();
              throw new Error(`Gemini API request failed: ${geminiResponse.statusText} - ${errorBody}`);
            }
          } catch (error) {
            lastError = error;
            attempt++;
            if (attempt >= maxRetries) {
              throw lastError; // Throw the last error after all retries
            }
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
    
        if (!geminiResponse || !geminiResponse.ok) {
          throw new Error('Failed to get a successful response from Gemini API after multiple retries.');
        }
    
            const geminiData = await geminiResponse.json();
            const analysisResultText = geminiData.candidates[0].content.parts[0].text;
            const parsedAnalysis = JSON.parse(analysisResultText);
        
            return new Response(JSON.stringify(parsedAnalysis), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })      } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
