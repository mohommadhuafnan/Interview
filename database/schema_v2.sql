-- InterviewGuard v2: Invitations, Sessions, Chat, Resume Screening

-- Invitation links (Zoom-style shareable URLs)
CREATE TABLE IF NOT EXISTS interview_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    invite_token VARCHAR(64) UNIQUE NOT NULL,
    created_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    max_uses INT DEFAULT 1,
    use_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live session state (waiting room → live → ended)
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE UNIQUE,
    status VARCHAR(30) DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'waiting', 'ready', 'live', 'paused', 'completed', 'cancelled')),
    candidate_name VARCHAR(255),
    candidate_email VARCHAR(255),
    candidate_joined_at TIMESTAMPTZ,
    admin_joined_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT DEFAULT 0,
    recording_url TEXT,
    network_quality JSONB DEFAULT '{}',
    device_fingerprint JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview notes (admin)
CREATE TABLE IF NOT EXISTS interview_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Code submissions during interview
CREATE TABLE IF NOT EXISTS code_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    code TEXT NOT NULL,
    output TEXT,
    plagiarism_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resume screening
CREATE TABLE IF NOT EXISTS resume_screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_email VARCHAR(255),
    file_name VARCHAR(500),
    file_url TEXT,
    ai_score DECIMAL(5,2),
    skills JSONB DEFAULT '[]',
    experience_years DECIMAL(4,1),
    analysis_summary TEXT,
    recommendation VARCHAR(20) CHECK (recommendation IN ('hire', 'consider', 'reject')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add invite_token column to interviews if missing
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64) UNIQUE;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS coding_languages JSONB DEFAULT '["javascript","python","java"]';

-- Session status index
CREATE INDEX IF NOT EXISTS idx_invitations_token ON interview_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_sessions_interview ON interview_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_interview ON chat_messages(interview_id);
