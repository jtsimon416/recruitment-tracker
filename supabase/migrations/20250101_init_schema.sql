-- Create clients table (assuming basic structure)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recruiters table (assuming basic structure)
CREATE TABLE IF NOT EXISTS recruiters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT,
  user_id UUID, -- For linking to auth.users
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create positions table (reconstructed)
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create candidates table (reconstructed)
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  document_type TEXT,
  notes TEXT,
  skills TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pipeline table (reconstructed)
CREATE TABLE IF NOT EXISTS pipeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES recruiters(id) ON DELETE SET NULL,
  stage TEXT,
  status TEXT,
  highest_stage_reached TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
