-- Migration: Add profile_type to candidates table
-- Purpose: Distinguish between full profiles (with resume) and shell profiles (archived from outreach)
-- Date: 2025-01-23

-- Add profile_type column
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'full';

-- Add comment
COMMENT ON COLUMN candidates.profile_type IS 'Type of profile: "full" (complete profile with resume) or "shell" (archived from outreach with minimal data)';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_candidates_profile_type ON candidates(profile_type);

-- Update existing records to be 'full' profiles
UPDATE candidates SET profile_type = 'full' WHERE profile_type IS NULL;
