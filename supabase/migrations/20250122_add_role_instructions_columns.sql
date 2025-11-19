-- Migration: Add Role Instructions columns to positions table
-- Created: 2025-10-19
-- Purpose: Enable managers to upload kickoff notes/marching orders for ANY position at ANY time

-- Add new columns to positions table
ALTER TABLE positions
ADD COLUMN IF NOT EXISTS role_instructions_url TEXT,
ADD COLUMN IF NOT EXISTS role_instructions_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS role_instructions_viewed_by JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS role_instructions_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN positions.role_instructions_url IS 'Link to uploaded Word document with role instructions/kickoff notes';
COMMENT ON COLUMN positions.role_instructions_uploaded_at IS 'Timestamp when role instructions were uploaded';
COMMENT ON COLUMN positions.role_instructions_viewed_by IS 'Array of recruiter IDs who have viewed the instructions';
COMMENT ON COLUMN positions.role_instructions_notes IS 'Manager notes about the role instructions';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_positions_role_instructions ON positions(role_instructions_url) WHERE role_instructions_url IS NOT NULL;
