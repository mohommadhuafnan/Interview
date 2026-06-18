import type { User, Interview, SuspiciousEvent } from './types';

export const DEMO_TOKEN = 'demo-token';

export const demoUser: User = {
  id: 'demo-hr-001',
  email: 'hr@interviewguard.com',
  full_name: 'HR Manager',
  role: 'hr',
};

export const demoInterviews: Interview[] = [
  {
    id: 'demo-interview-001',
    title: 'Senior Software Engineer Interview',
    candidate_id: 'demo-candidate-001',
    interviewer_id: 'demo-interviewer-001',
    status: 'in_progress',
    questions: [
      'Explain the difference between REST and GraphQL.',
      'Describe a challenging bug you fixed recently.',
      'Implement a function to reverse a linked list.',
    ],
    trust_score: 78,
    risk_level: 'medium',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-interview-002',
    title: 'Frontend Developer Interview',
    candidate_id: 'demo-candidate-002',
    status: 'scheduled',
    questions: ['What is React virtual DOM?'],
    trust_score: 92,
    risk_level: 'low',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const demoEvents: SuspiciousEvent[] = [
  {
    id: 'evt-1',
    interview_id: 'demo-interview-001',
    event_type: 'gaze_anomaly',
    severity: 'medium',
    description: 'Suspicious gaze: right (score: 62)',
    confidence: 85,
    created_at: new Date().toISOString(),
  },
  {
    id: 'evt-2',
    interview_id: 'demo-interview-001',
    event_type: 'tab_switch',
    severity: 'high',
    description: 'Browser event: visibility_hidden',
    confidence: 95,
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'evt-3',
    interview_id: 'demo-interview-001',
    event_type: 'head_pose_anomaly',
    severity: 'medium',
    description: 'Abnormal head pose detected: yaw=28.5',
    confidence: 88,
    created_at: new Date(Date.now() - 300000).toISOString(),
  },
];

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('token') === DEMO_TOKEN;
}

export function enableDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', DEMO_TOKEN);
  localStorage.setItem('demo_user', JSON.stringify(demoUser));
}

export function getDemoUser(): User {
  if (typeof window === 'undefined') return demoUser;
  const stored = localStorage.getItem('demo_user');
  if (stored) return JSON.parse(stored) as User;
  return demoUser;
}
