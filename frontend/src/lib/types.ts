export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'hr' | 'interviewer' | 'candidate';
}

export interface Interview {
  id: string;
  title: string;
  candidate_id: string;
  interviewer_id?: string;
  status: string;
  questions: string[];
  trust_score?: number;
  risk_level?: string;
  created_at: string;
}

export interface SuspiciousEvent {
  id: string;
  interview_id: string;
  event_type: string;
  severity: string;
  description: string;
  confidence: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}
