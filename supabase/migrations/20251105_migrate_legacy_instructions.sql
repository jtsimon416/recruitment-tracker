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
