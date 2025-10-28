import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.0';

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  summary: string | null;
  total_years_experience: number | null;
  most_recent_title: string | null;
  most_recent_company: string | null;
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

const RESUME_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Full name of the candidate"
    },
    email: {
      type: "string",
      description: "Email address of the candidate"
    },
    phone: {
      type: "string",
      description: "Phone number of the candidate"
    },
    linkedin_url: {
      type: ["string", "null"],
      description: "LinkedIn profile URL if available, otherwise null"
    },
    summary: {
      type: ["string", "null"],
      description: "Brief professional summary or objective statement (max 100 words)"
    },
    total_years_experience: {
      type: ["number", "null"],
      description: "Total years of professional experience calculated from work history"
    },
    most_recent_title: {
      type: ["string", "null"],
      description: "Job title of the most recent position"
    },
    most_recent_company: {
      type: ["string", "null"],
      description: "Company name of the most recent position"
    },
    skills: {
      type: "array",
      items: {
        type: "string"
      },
      description: "List of professional skills"
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: {
            type: "string",
            description: "Name of the educational institution"
          },
          degree: {
            type: "string",
            description: "Degree or certification obtained"
          },
          year: {
            type: ["number", "null"],
            description: "Graduation year if available"
          }
        },
        required: ["institution", "degree"]
      },
      description: "Educational background"
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Job title"
          },
          company: {
            type: "string",
            description: "Company name"
          },
          start_date: {
            type: "string",
            description: "Start date in format like 'Jan 2020' or '2020'"
          },
          end_date: {
            type: ["string", "null"],
            description: "End date in same format as start_date, or null if current position"
          },
          description_summary: {
            type: ["string", "null"],
            description: "Brief summary of responsibilities and achievements"
          }
        },
        required: ["title", "company", "start_date"]
      },
      description: "Work experience history"
    }
  },
  required: ["name", "email", "phone", "skills", "education", "experience"]
};

export async function parseResumeWithAI(resumeText: string): Promise<ResumeData> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = `You are an expert recruitment data parser with deep expertise in extracting and structuring candidate information from resumes.

Your responsibilities:
1. Extract all contact information accurately (name, email, phone, LinkedIn URL)
2. Calculate total_years_experience by analyzing all work experience entries and their date ranges
3. Identify the most recent job title and company from the work history
4. Create a concise professional summary (max 100 words) that captures key qualifications
5. Extract all technical and professional skills as a clean list
6. Structure education history with institution, degree, and graduation year
7. Structure work experience with titles, companies, dates, and brief description summaries
8. Return data in strict JSON format matching the provided schema
9. Use null for missing optional fields rather than empty strings or placeholder text
10. For dates, use formats like "Jan 2020" or "2020" for start_date and end_date fields

Be thorough, accurate, and consistent in your extraction.`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESUME_SCHEMA
      }
    });

    const result = await model.generateContent(
      `Parse the following resume text and extract all relevant information:\n\n${resumeText}`
    );

    const response = await result.response;
    const text = response.text();

    const parsedData = JSON.parse(text) as ResumeData;

    return parsedData;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error(`Failed to parse resume with AI: ${error.message}`);
  }
}