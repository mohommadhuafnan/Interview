import { getSupabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveCodePayload {
  code: string;
  language: string;
  output?: string;
  action: 'typing' | 'run';
  updatedAt: number;
}

const codeChannels = new Map<string, RealtimeChannel>();

function ensureCodeChannel(interviewId: string): RealtimeChannel | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (!codeChannels.has(interviewId)) {
    const channel = supabase.channel(`code-live:${interviewId}`);
    channel.subscribe();
    codeChannels.set(interviewId, channel);
  }

  return codeChannels.get(interviewId) ?? null;
}

export function broadcastLiveCode(interviewId: string, payload: Omit<LiveCodePayload, 'updatedAt'>) {
  const channel = ensureCodeChannel(interviewId);
  if (!channel) return;

  void channel.send({
    type: 'broadcast',
    event: 'code-update',
    payload: { ...payload, updatedAt: Date.now() },
  });
}

export function subscribeLiveCode(
  interviewId: string,
  onUpdate: (payload: LiveCodePayload) => void
) {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`code-live:${interviewId}`)
    .on('broadcast', { event: 'code-update' }, ({ payload }) => {
      onUpdate(payload as LiveCodePayload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchLatestCode(interviewId: string): Promise<LiveCodePayload | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('code_submissions')
    .select('code, language, output, created_at')
    .eq('interview_id', interviewId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    code: data.code,
    language: data.language,
    output: data.output || undefined,
    action: 'run',
    updatedAt: new Date(data.created_at).getTime(),
  };
}
