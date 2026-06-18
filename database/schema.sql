-- InterviewGuard AI - Supabase Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'hr', 'interviewer', 'candidate')),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    questions JSONB DEFAULT '[]',
    trust_score DECIMAL(5,2),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    recording_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suspicious events table
CREATE TABLE IF NOT EXISTS suspicious_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    confidence DECIMAL(5,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    screenshot_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust score snapshots
CREATE TABLE IF NOT EXISTS trust_score_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    trust_score DECIMAL(5,2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    breakdown JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview answers
CREATE TABLE IF NOT EXISTS interview_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    question_index INT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    code TEXT,
    originality_score DECIMAL(5,2),
    ai_probability DECIMAL(5,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    generated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_events_interview ON suspicious_events(interview_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON suspicious_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Row Level Security (disabled for backend API access via Supabase client)
-- Enable + add policies when using anon key from the browser directly
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE suspicious_events ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER interviews_updated_at BEFORE UPDATE ON interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
