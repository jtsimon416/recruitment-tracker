-- Add source column to candidates table to track origin (e.g., 'Career Page', 'LinkedIn', 'Manual')
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual';

-- Add comment to column
COMMENT ON COLUMN candidates.source IS 'Origin of the candidate application (e.g., Career Page, LinkedIn, Manual)';
