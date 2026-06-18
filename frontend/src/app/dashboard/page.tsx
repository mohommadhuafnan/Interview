'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TrustScoreGauge from '@/components/TrustScoreGauge';
import EventTimeline from '@/components/EventTimeline';
import { useAuth } from '@/lib/auth';
import { api, Interview, SuspiciousEvent } from '@/lib/api';
import { demoInterviews, demoEvents } from '@/lib/demo';
import { Users, Monitor, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>(demoInterviews);
  const [events, setEvents] = useState<SuspiciousEvent[]>(demoEvents);

  useEffect(() => {
    if (!loading && user?.role === 'candidate') {
      router.replace('/interview');
    }
  }, [user, loading, router]);

  useEffect(() => {
    api.getInterviews().then(setInterviews).catch(() => setInterviews(demoInterviews));
    api.getAllEvents().then(setEvents).catch(() => setEvents(demoEvents));
  }, []);

  if (loading) {
    return (
      <main className="max-w-7xl flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const stats = [
    { label: 'Active Interviews', value: interviews.filter((i) => i.status === 'in_progress').length, icon: Monitor, color: 'text-blue-600 bg-blue-100' },
    { label: 'Total Candidates', value: interviews.length, icon: Users, color: 'text-indigo-600 bg-indigo-100' },
    { label: 'Suspicious Events', value: events.length, icon: AlertTriangle, color: 'text-amber-600 bg-amber-100' },
    { label: 'Avg Trust Score', value: '78%', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
  ];

  return (
    <main className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back, {user?.full_name ?? 'HR Manager'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" /> Recent Interviews
          </h2>
          <div className="space-y-3">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50/80 hover:bg-blue-50/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{interview.title}</p>
                  <p className="text-sm text-slate-500 capitalize">{interview.status.replace('_', ' ')}</p>
                </div>
                {interview.trust_score != null ? (
                  <TrustScoreGauge score={interview.trust_score} riskLevel={interview.risk_level} size="sm" />
                ) : (
                  <span className="text-sm text-slate-400">Pending</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Alerts</h2>
          <EventTimeline events={events.slice(0, 5)} />
        </div>
      </div>
    </main>
  );
}
