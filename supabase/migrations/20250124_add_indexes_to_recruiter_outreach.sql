-- Migration: Add indexes to recruiter_outreach for performance
-- Purpose: Optimize duplicate checking during bulk upload and Smart Filters in Talent Pool
-- Date: 2025-01-23

-- Index for fast duplicate checking during bulk upload
CREATE INDEX IF NOT EXISTS idx_outreach_linkedin_url ON recruiter_outreach(linkedin_url);

-- Index for fast filtering by position for Smart Filters
CREATE INDEX IF NOT EXISTS idx_outreach_position_id ON recruiter_outreach(position_id);

-- Index for fast filtering by recruiter for Smart Filters
CREATE INDEX IF NOT EXISTS idx_outreach_recruiter_id ON recruiter_outreach(recruiter_id);

-- Index for fast filtering by status for Smart Filters
CREATE INDEX IF NOT EXISTS idx_outreach_activity_status ON recruiter_outreach(activity_status);

-- Index for fast filtering by rating for Smart Filters
CREATE INDEX IF NOT EXISTS idx_outreach_rating ON recruiter_outreach(rating);

-- Add comments
COMMENT ON INDEX idx_outreach_linkedin_url IS 'Fast duplicate checking during bulk upload';
COMMENT ON INDEX idx_outreach_position_id IS 'Fast filtering by position for Smart Filters';
COMMENT ON INDEX idx_outreach_recruiter_id IS 'Fast filtering by recruiter for Smart Filters';
COMMENT ON INDEX idx_outreach_activity_status IS 'Fast filtering by status for Smart Filters';
COMMENT ON INDEX idx_outreach_rating IS 'Fast filtering by rating for Smart Filters';
