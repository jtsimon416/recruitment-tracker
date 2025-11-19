/*
  # Secure Candidates Table

  This migration adds Row Level Security to the candidates table
  to ensure only authenticated users can access candidate data.

  1. Security Changes
    - Enable RLS on candidates table
    - Add policy for authenticated users to SELECT candidates
    - Add policy for authenticated users to INSERT candidates
    - Add policy for authenticated users to UPDATE candidates
    - Add policy for authenticated users to DELETE candidates
*/

-- Enable Row Level Security on the candidates table
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all candidates
CREATE POLICY "Authenticated users can view candidates"
  ON candidates
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert candidates
CREATE POLICY "Authenticated users can insert candidates"
  ON candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update candidates
CREATE POLICY "Authenticated users can update candidates"
  ON candidates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete candidates
CREATE POLICY "Authenticated users can delete candidates"
  ON candidates
  FOR DELETE
  TO authenticated
  USING (true);
