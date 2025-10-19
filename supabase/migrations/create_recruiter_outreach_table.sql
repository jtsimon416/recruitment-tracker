-- Create recruiter_outreach table for LinkedIn activity tracking
CREATE TABLE recruiter_outreach (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID REFERENCES recruiters(id),
  position_id UUID REFERENCES positions(id),
  linkedin_url TEXT NOT NULL,
  candidate_name TEXT,
  activity_status TEXT NOT NULL DEFAULT 'outreach_sent',
  scheduled_call_date TIMESTAMPTZ,
  last_followup_date TIMESTAMPTZ,
  followup_needed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recruiter_id, linkedin_url, position_id)
);

-- Create indexes for optimal query performance
CREATE INDEX idx_outreach_recruiter ON recruiter_outreach(recruiter_id);
CREATE INDEX idx_outreach_position ON recruiter_outreach(position_id);
CREATE INDEX idx_outreach_created ON recruiter_outreach(created_at DESC);
CREATE INDEX idx_outreach_scheduled ON recruiter_outreach(scheduled_call_date);
CREATE INDEX idx_outreach_followup ON recruiter_outreach(followup_needed) WHERE followup_needed = TRUE;

-- Add comment for documentation
COMMENT ON TABLE recruiter_outreach IS 'Tracks recruiter LinkedIn outreach activities and conversations';
COMMENT ON COLUMN recruiter_outreach.activity_status IS 'Valid statuses: outreach_sent, reply_received, call_scheduled, cold, completed';
