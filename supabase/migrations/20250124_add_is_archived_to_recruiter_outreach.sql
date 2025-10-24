-- Migration: Add is_archived flag to recruiter_outreach table
-- Purpose: Track which outreach records have been archived when positions close
-- Date: 2025-01-24

-- Add is_archived column
ALTER TABLE recruiter_outreach
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN recruiter_outreach.is_archived IS 'Flag indicating this outreach record has been archived to the Talent Pool';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_recruiter_outreach_is_archived ON recruiter_outreach(is_archived);

-- Update existing records to be not archived
UPDATE recruiter_outreach SET is_archived = false WHERE is_archived IS NULL;
