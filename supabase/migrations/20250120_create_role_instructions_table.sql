-- Migration: Create role_instructions table for multiple documents per position
-- Created: 2025-01-20
-- Purpose: Allow managers to upload multiple role instruction documents per position
--          and track which recruiters have viewed each document

-- Create role_instructions table for multiple documents per position
CREATE TABLE IF NOT EXISTS role_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  notes TEXT,
  uploaded_by UUID REFERENCES recruiters(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_by JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries by position
CREATE INDEX IF NOT EXISTS idx_role_instructions_position
ON role_instructions(position_id);

-- Add index for uploaded_at ordering
CREATE INDEX IF NOT EXISTS idx_role_instructions_uploaded
ON role_instructions(uploaded_at DESC);

-- Add index for uploaded_by for analytics
CREATE INDEX IF NOT EXISTS idx_role_instructions_uploaded_by
ON role_instructions(uploaded_by);

-- Add comments for documentation
COMMENT ON TABLE role_instructions IS 'Stores multiple role instruction documents per position with individual view tracking';
COMMENT ON COLUMN role_instructions.id IS 'Unique identifier for each role instruction document';
COMMENT ON COLUMN role_instructions.position_id IS 'Foreign key to positions table';
COMMENT ON COLUMN role_instructions.file_url IS 'Full URL to the document in Supabase storage';
COMMENT ON COLUMN role_instructions.file_name IS 'Original filename of the uploaded document';
COMMENT ON COLUMN role_instructions.notes IS 'Optional notes from the manager about this document';
COMMENT ON COLUMN role_instructions.uploaded_by IS 'Foreign key to recruiters table (manager who uploaded)';
COMMENT ON COLUMN role_instructions.uploaded_at IS 'Timestamp when document was uploaded';
COMMENT ON COLUMN role_instructions.viewed_by IS 'JSONB array of recruiter IDs who have viewed this specific document';
COMMENT ON COLUMN role_instructions.created_at IS 'Timestamp when record was created';

-- Enable Row Level Security
ALTER TABLE role_instructions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read role instructions
CREATE POLICY "Authenticated users can view role instructions"
ON role_instructions FOR SELECT
TO authenticated
USING (true);

-- Create policy for authenticated users to insert role instructions
CREATE POLICY "Authenticated users can insert role instructions"
ON role_instructions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for authenticated users to update role instructions (for view tracking)
CREATE POLICY "Authenticated users can update role instructions"
ON role_instructions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to delete role instructions
CREATE POLICY "Authenticated users can delete role instructions"
ON role_instructions FOR DELETE
TO authenticated
USING (true);

-- Migration script to copy existing role_instructions data from positions table
-- This will only migrate positions that have role_instructions_url populated
DO $$
DECLARE
  pos_record RECORD;
BEGIN
  -- Loop through positions with existing role instructions
  FOR pos_record IN
    SELECT
      id,
      role_instructions_url,
      role_instructions_notes,
      role_instructions_uploaded_at,
      role_instructions_viewed_by
    FROM positions
    WHERE role_instructions_url IS NOT NULL
  LOOP
    -- Insert the existing data into the new role_instructions table
    INSERT INTO role_instructions (
      position_id,
      file_url,
      file_name,
      notes,
      uploaded_at,
      viewed_by
    ) VALUES (
      pos_record.id,
      pos_record.role_instructions_url,
      'Legacy Role Instructions.docx', -- Default filename for migrated data
      pos_record.role_instructions_notes,
      COALESCE(pos_record.role_instructions_uploaded_at, NOW()),
      COALESCE(pos_record.role_instructions_viewed_by, '[]'::jsonb)
    );

    RAISE NOTICE 'Migrated role instructions for position %', pos_record.id;
  END LOOP;

  RAISE NOTICE 'Migration completed successfully';
END $$;
