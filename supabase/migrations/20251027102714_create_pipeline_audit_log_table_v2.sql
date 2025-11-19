/*
  # Create Pipeline Audit Log Table

  1. New Tables
    - `pipeline_audit_log`
      - `id` (uuid, primary key)
      - `position_id` (uuid) - Reference to position
      - `event_type` (text) - Type of event
      - `performed_by` (uuid) - User who performed the action
      - `notes` (text, nullable) - Additional notes
      - `metadata` (jsonb, nullable) - Flexible data storage
      - `created_at` (timestamptz) - When the event occurred

  2. Security
    - Enable RLS
    - Add policies for authenticated users
  
  3. Indexes
    - Index on position_id
    - Index on created_at
*/

CREATE TABLE IF NOT EXISTS pipeline_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL,
  event_type text NOT NULL,
  performed_by uuid,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_audit_log_position_id ON pipeline_audit_log(position_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_audit_log_created_at ON pipeline_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_audit_log_event_type ON pipeline_audit_log(event_type);

ALTER TABLE pipeline_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit logs"
  ON pipeline_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit logs"
  ON pipeline_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
