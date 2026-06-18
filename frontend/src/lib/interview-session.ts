import { getSupabase } from './supabase';

export type SessionStatus = 'scheduled' | 'waiting' | 'ready' | 'live' | 'paused' | 'completed' | 'cancelled';

export interface InterviewSession {
  id: string;
  interview_id: string;
  status: SessionStatus;
  candidate_name?: string;
  candidate_email?: string;
  candidate_joined_at?: string;
  admin_joined_at?: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  network_quality?: Record<string, unknown>;
  device_fingerprint?: Record<string, unknown>;
}

export interface InterviewInvitation {
  id: string;
  interview_id: string;
  invite_token: string;
  is_active: boolean;
  expires_at?: string;
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

export async function createInterviewWithInvite(data: {
  title: string;
  candidate_id?: string;
  interviewer_id?: string;
  questions?: string[];
  created_by?: string;
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const token = generateToken();
  const { data: interview, error } = await supabase
    .from('interviews')
    .insert({
      title: data.title,
      candidate_id: data.candidate_id || null,
      interviewer_id: data.interviewer_id || null,
      questions: data.questions || [],
      status: 'scheduled',
      invite_token: token,
      coding_languages: ['javascript', 'python', 'java', 'cpp', 'c', 'csharp'],
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from('interview_invitations').insert({
    interview_id: interview.id,
    invite_token: token,
    created_by: data.created_by || null,
    is_active: true,
  });

  await supabase.from('interview_sessions').insert({
    interview_id: interview.id,
    status: 'scheduled',
  });

  return { interview, inviteLink: `${window.location.origin}/join/${token}` };
}

export async function getInterviewByToken(token: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('interviews')
    .select('*')
    .eq('invite_token', token)
    .single();

  return data;
}

export async function joinWaitingRoom(token: string, candidateName: string, candidateEmail?: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const interview = await getInterviewByToken(token);
  if (!interview) throw new Error('Invalid invitation link');

  const { data: session, error } = await supabase
    .from('interview_sessions')
    .upsert(
      {
        interview_id: interview.id,
        status: 'waiting',
        candidate_name: candidateName,
        candidate_email: candidateEmail || null,
        candidate_joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'interview_id' }
    )
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('interviews')
    .update({ status: 'scheduled' })
    .eq('id', interview.id);

  return { interview, session };
}

export async function candidateRequestStart(interviewId: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from('interview_sessions')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('interview_id', interviewId);
}

export async function adminStartInterview(interviewId: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const now = new Date().toISOString();
  await supabase
    .from('interview_sessions')
    .update({
      status: 'live',
      started_at: now,
      admin_joined_at: now,
      updated_at: now,
    })
    .eq('interview_id', interviewId);

  await supabase
    .from('interviews')
    .update({ status: 'in_progress', started_at: now })
    .eq('id', interviewId);
}

export async function getSession(interviewId: string): Promise<InterviewSession | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('interview_sessions')
    .select('*')
    .eq('interview_id', interviewId)
    .single();

  return data;
}

export async function getWaitingSessions() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from('interview_sessions')
    .select('*, interviews(title, invite_token)')
    .in('status', ['waiting', 'ready', 'live'])
    .order('updated_at', { ascending: false });

  return data || [];
}

export function subscribeToSession(
  interviewId: string,
  onUpdate: (session: InterviewSession) => void
) {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`session:${interviewId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'interview_sessions', filter: `interview_id=eq.${interviewId}` },
      (payload) => onUpdate(payload.new as InterviewSession)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToAllSessions(onUpdate: () => void) {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('all-sessions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_sessions' }, onUpdate)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function sendChatMessage(
  interviewId: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  message: string
) {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from('chat_messages').insert({
    interview_id: interviewId,
    sender_id: senderId,
    sender_name: senderName,
    sender_role: senderRole,
    message,
  });
}

export async function getChatMessages(interviewId: string) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('interview_id', interviewId)
    .order('created_at', { ascending: true });

  return data || [];
}

export function subscribeToChat(interviewId: string, onMessage: (msg: unknown) => void) {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`chat:${interviewId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `interview_id=eq.${interviewId}` },
      (payload) => onMessage(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export async function saveCodeSubmission(interviewId: string, language: string, code: string, output?: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from('code_submissions').insert({
    interview_id: interviewId,
    language,
    code,
    output: output || null,
  });
}

export async function logSuspiciousEvent(
  interviewId: string,
  eventType: string,
  severity: string,
  description: string,
  confidence = 85
) {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from('suspicious_events').insert({
    interview_id: interviewId,
    event_type: eventType,
    severity,
    description,
    confidence,
    metadata: {},
  });
}
