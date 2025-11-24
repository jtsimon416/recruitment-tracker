ALTER TABLE positions ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS screening_answers JSONB DEFAULT '[]'::jsonb;
