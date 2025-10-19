import { Anthropic } from 'https://esm.sh/@anthropic-ai/sdk@0.17.0'; // Using the Anthropic SDK

// 1. Define the exact, strict output structure (Schema) for the AI
export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  summary: string | null;
  total_years_experience: number | null;
  most_recent_title: string | null;
  most_recent_company: string | null;
  // Arrays for structured data
  skills: string[];
  education: Array<{
    institution: string;
    degree: string;
    year: number | null;
  }>;
  experience: Array<{
    title: string;
    company: string;
    start_date: string;
    end_date: string | null;
    description_summary: string | null;
  }>;
}

// 2. Initialize the Anthropic Client
const anthropic = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY"), // Key loaded from the ANTHROPIC_API_KEY secret
});

/**
 * Uses Anthropic Claude to parse raw text into a structured JSON object.
 * @param resumeText The raw text extracted from the resume file.
 * @returns A promise resolving to the structured ResumeData object.
 */
export async function parseResumeWithAI(resumeText: string): Promise<ResumeData> {
    const prompt = `
        You are an expert recruitment data parser. Your task is to accurately extract all relevant candidate information from the provided resume text and return it strictly in the required JSON object format.

        INSTRUCTIONS:
        1. Extract all contact information (name, email, phone, LinkedIn URL).
        2. Calculate the total years of professional experience based on the start/end dates in the experience section. Return only the numerical value.
        3. Summarize the resume into a short paragraph (max 100 words).
        4. Extract all skills as a clean list of strings (e.g., ["Python", "SQL", "Scrum"]).
        5. For Experience and Education, map the data directly into the arrays as structured objects.
        6. You must return only the JSON object.
    `;

    try {
        const message = await anthropic.messages.create({
            model: "claude-3-haiku-20240307", // The guaranteed working free model
            max_tokens: 4096, 
            messages: [
                { role: "user", content: `${prompt}\n\nRESUME TEXT:\n\n${resumeText}` }
            ],
            // CRUCIAL: Use the Anthropic tool for structured JSON output
            tool_choice: { type: "tool", name: "resume_parser" }, 
            tools: [{
                name: "resume_parser",
                description: "Parses a resume and returns a structured JSON object.",
                input_schema: {
                    type: "object",
                    properties: {
                         // This is the structure the AI must return
                        data: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                email: { type: "string" },
                                phone: { type: "string" },
                                linkedin_url: { type: "string", nullable: true },
                                summary: { type: "string", nullable: true },
                                total_years_experience: { type: "number", nullable: true },
                                most_recent_title: { type: "string", nullable: true },
                                most_recent_company: { type: "string", nullable: true },
                                skills: { type: "array", items: { type: "string" } },
                                education: { type: "array", items: { type: "object", properties: {
                                    institution: { type: "string" },
                                    degree: { type: "string" },
                                    year: { type: "number", nullable: true }
                                }, required: ["institution", "degree"] }},
                                experience: { type: "array", items: { type: "object", properties: {
                                    title: { type: "string" },
                                    company: { type: "string" },
                                    start_date: { type: "string" },
                                    end_date: { type: "string", nullable: true },
                                    description_summary: { type: "string", nullable: true }
                                }, required: ["title", "company", "start_date"] }}
                            },
                            required: ["name", "email", "phone", "skills"]
                        }
                    }
                }
            }]
        });

        // Extract the JSON data from the tool call result
        const toolCall = message.content.find(c => c.type === 'tool_use');
        
        if (toolCall && toolCall.type === 'tool_use') {
            return toolCall.input.data as ResumeData;
        }

        throw new Error("Anthropic did not return the required structured JSON data.");

    } catch (error) {
        console.error("Anthropic API Error:", error);
        throw new Error(`Failed to parse resume with AI: ${error.message}`);
    }
}