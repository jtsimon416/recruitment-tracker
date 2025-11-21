import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

serve(async (req) => {
    console.log('Function invoked: generate-interview-questions');

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { candidateProfile, jobDescription } = await req.json();

        if (!candidateProfile || !jobDescription) {
            throw new Error('candidateProfile and jobDescription are required.');
        }

        console.log('Generating interview questions...');

        const prompt = `
      You are an expert technical recruiter. Compare the candidate's LinkedIn profile/resume text against the Job Description. Generate 10 tailored, behavioral, and technical interview questions to gauge their fit. Focus on gaps in experience or specific required skills.

      --- JOB DESCRIPTION ---
      ${jobDescription}

      --- CANDIDATE PROFILE ---
      ${candidateProfile}

      --- INSTRUCTIONS ---
      Return ONLY a numbered list of 10 questions. Do not include any introductory or concluding text.
    `;

        const maxRetries = 3;
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
                            }]
                        }]
                    })
                });

                if (geminiResponse.ok) break;

                const errorText = await geminiResponse.text();
                console.warn(`Attempt ${attempt + 1} failed: ${geminiResponse.status} - ${errorText}`);
                lastError = new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
                attempt++;

                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));

            } catch (error) {
                console.warn(`Attempt ${attempt + 1} network error:`, error);
                lastError = error;
                attempt++;
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }

        if (!geminiResponse || !geminiResponse.ok) {
            throw lastError || new Error('Failed to connect to Gemini API after multiple attempts');
        }

        const data = await geminiResponse.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error('No content generated from Gemini API');
        }

        return new Response(
            JSON.stringify({ questions: generatedText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
