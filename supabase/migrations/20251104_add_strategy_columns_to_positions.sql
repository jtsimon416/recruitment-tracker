-- Adds storage for the AI-generated strategy for each role
ALTER TABLE public.positions
ADD COLUMN IF NOT EXISTS anonymized_jd TEXT,        -- Stores the client-safe JD text
ADD COLUMN IF NOT EXISTS ai_rubric JSONB,           -- Stores the Director-tweaked weighted rubric
ADD COLUMN IF NOT EXISTS ai_toolkit JSONB;          -- Stores the generated questions & booleans
