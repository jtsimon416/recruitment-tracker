-- Adds storage for the AI-generated strategy for each role
ALTER TABLE public.positions
ADD COLUMN anonymized_jd TEXT,        -- Stores the client-safe JD text
ADD COLUMN ai_rubric JSONB,           -- Stores the Director-tweaked weighted rubric
ADD COLUMN ai_toolkit JSONB;          -- Stores the generated questions & booleans
