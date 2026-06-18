const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import {
  isDemoMode,
  demoUser,
  demoInterviews,
  demoEvents,
} from './demo';

export type { User, Interview, SuspiciousEvent } from './types';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isDemoMode()) {
    return demoRequest<T>(path, options);
  }

  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

function demoRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (path === '/api/auth/me') return Promise.resolve(demoUser as T);
  if (path === '/api/interviews/') return Promise.resolve(demoInterviews as T);
  if (path.startsWith('/api/interviews/') && path.endsWith('/events')) {
    const id = path.split('/')[3];
    return Promise.resolve(demoEvents.filter((e) => e.interview_id === id) as T);
  }
  if (path === '/api/interviews/events/all') return Promise.resolve(demoEvents as T);
  if (path.includes('/trust-score')) {
    return Promise.resolve({
      trust_score: 78,
      risk_level: 'medium',
      breakdown: {
        eye_movement: 72,
        head_pose: 80,
        browser_activity: 65,
        answer_originality: 88,
        voice_behavior: 90,
        multi_person: 95,
      },
      recommendation: 'Minor suspicious indicators detected. Review flagged events before final decision.',
    } as T);
  }
  if (path.includes('/reports/generate')) {
    return Promise.resolve({ report_url: '/reports/demo-report.pdf' } as T);
  }
  if (options.method === 'POST' || options.method === 'PATCH') {
    return Promise.resolve({ ok: true } as T);
  }
  const match = path.match(/\/api\/interviews\/([^/]+)$/);
  if (match) {
    const interview = demoInterviews.find((i) => i.id === match[1]);
    if (interview) return Promise.resolve(interview as T);
  }
  return Promise.resolve({} as T);
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: import('./types').User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; password: string; full_name: string; role: string }) =>
    request<{ access_token: string; user: import('./types').User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<import('./types').User>('/api/auth/me'),

  getInterviews: () => request<import('./types').Interview[]>('/api/interviews/'),

  getInterview: (id: string) => request<import('./types').Interview>(`/api/interviews/${id}`),

  updateInterviewStatus: (id: string, status: string) =>
    request(`/api/interviews/${id}/status?status=${status}`, { method: 'PATCH' }),

  getEvents: (interviewId: string) =>
    request<import('./types').SuspiciousEvent[]>(`/api/interviews/${interviewId}/events`),

  getAllEvents: () => request<import('./types').SuspiciousEvent[]>('/api/interviews/events/all'),

  createEvent: (data: Partial<import('./types').SuspiciousEvent> & { interview_id: string }) =>
    request('/api/interviews/events', { method: 'POST', body: JSON.stringify(data) }),

  analyzeGaze: (interviewId: string, image: string) =>
    request('/api/analysis/gaze', {
      method: 'POST',
      body: JSON.stringify({ interview_id: interviewId, analysis_type: 'gaze', data: { image } }),
    }),

  analyzeHeadPose: (interviewId: string, image: string) =>
    request('/api/analysis/head-pose', {
      method: 'POST',
      body: JSON.stringify({ interview_id: interviewId, analysis_type: 'head_pose', data: { image } }),
    }),

  analyzeMultiPerson: (interviewId: string, image: string) =>
    request('/api/analysis/multi-person', {
      method: 'POST',
      body: JSON.stringify({ interview_id: interviewId, analysis_type: 'multi_person', data: { image } }),
    }),

  analyzeAnswer: (interviewId: string, question: string, answer: string) =>
    request<{ originality_score: number; ai_probability: number; flags: string[]; analysis_summary: string }>(
      '/api/analysis/answer',
      {
        method: 'POST',
        body: JSON.stringify({ interview_id: interviewId, question, answer }),
      }
    ),

  logBrowserEvent: (interviewId: string, eventType: string, details: Record<string, unknown> = {}) =>
    request('/api/analysis/browser-event', {
      method: 'POST',
      body: JSON.stringify({ interview_id: interviewId, event_type: eventType, details }),
    }),

  calculateTrustScore: (interviewId: string, metrics: Record<string, number>) =>
    request<{ trust_score: number; risk_level: string; breakdown: Record<string, number>; recommendation: string }>(
      '/api/interviews/trust-score',
      {
        method: 'POST',
        body: JSON.stringify({ interview_id: interviewId, metrics }),
      }
    ),

  generateReport: (interviewId: string) =>
    request<{ report_url: string }>('/api/interviews/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ interview_id: interviewId }),
    }),
};

export function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin':
    case 'hr':
      return '/dashboard';
    case 'interviewer':
      return '/dashboard/monitoring';
    case 'candidate':
      return '/interview';
    default:
      return '/';
  }
}
