'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Radio, Users, Clock, Play, Plus, Link2 } from 'lucide-react';
import { getWaitingSessions } from '@/lib/interview-session';
import { pushNotification } from '@/components/DynamicIsland';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

interface SessionRow {
  id: string;
  interview_id: string;
  status: string;
  candidate_name?: string;
  candidate_joined_at?: string;
  interviews?: { title: string; invite_token: string };
}

export default function MonitoringListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = () => {
    getWaitingSessions().then((data) => {
      setSessions(data as SessionRow[]);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);

    const supabase = getSupabase();
    const channel = supabase
      ?.channel('admin-notifications')
      .on('broadcast', { event: 'candidate-waiting' }, ({ payload }) => {
        const p = payload as { candidateName: string; title: string; interviewId: string };
        pushNotification({
          type: 'join',
          title: `${p.candidateName} is waiting`,
          message: `Joined: ${p.title}`,
          action: {
            label: 'Start Interview',
            onClick: () => router.push(`/dashboard/monitoring/${p.interviewId}`),
          },
        });
        loadSessions();
      })
      .on('broadcast', { event: 'candidate-ready' }, ({ payload }) => {
        const p = payload as { candidateName: string; title: string; interviewId: string };
        pushNotification({
          type: 'start',
          title: `${p.candidateName} ready to start`,
          message: p.title,
          action: {
            label: 'Start Now',
            onClick: () => router.push(`/dashboard/monitoring/${p.interviewId}`),
          },
        });
        loadSessions();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [router]);

  const statusColor: Record<string, string> = {
    waiting: 'bg-amber-100 text-amber-700',
    ready: 'bg-blue-100 text-blue-700',
    live: 'bg-red-100 text-red-700',
    scheduled: 'bg-slate-100 text-slate-600',
  };

  return (
    <main className="ml-64 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Live Monitoring</h1>
          <p className="text-slate-500 mt-1">Real-time candidate sessions & notifications</p>
        </div>
        <Link href="/dashboard/interviews/create" className="btn-liquid flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Interview
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-ios p-16 text-center">
          <Radio className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Active Sessions</h2>
          <p className="text-slate-500 mb-6">Create an interview and share the invite link with a candidate</p>
          <Link href="/dashboard/interviews/create" className="btn-liquid inline-flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Create Interview Link
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-float p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{session.interviews?.title || 'Interview'}</h3>
                  <p className="text-sm text-slate-500">
                    {session.candidate_name || 'No candidate yet'}
                    {session.candidate_joined_at && (
                      <span className="ml-2 flex items-center gap-1 inline-flex">
                        <Clock className="w-3 h-3" />
                        {new Date(session.candidate_joined_at).toLocaleTimeString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColor[session.status] || statusColor.scheduled}`}>
                  {session.status === 'live' && <span className="live-dot inline-block mr-1" />}
                  {session.status}
                </span>
                <button
                  onClick={() => router.push(`/dashboard/monitoring/${session.interview_id}`)}
                  className="btn-liquid text-sm flex items-center gap-2 px-4 py-2"
                >
                  <Play className="w-4 h-4" />
                  {session.status === 'live' ? 'Monitor' : 'Start Interview'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
