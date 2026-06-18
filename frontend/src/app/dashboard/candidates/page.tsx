'use client';

import { useEffect, useState } from 'react';
import TrustScoreGauge from '@/components/TrustScoreGauge';
import { api, Interview } from '@/lib/api';
import { demoInterviews } from '@/lib/demo';

export default function CandidatesPage() {
  const [interviews, setInterviews] = useState<Interview[]>(demoInterviews);

  useEffect(() => {
    api.getInterviews().then(setInterviews).catch(() => setInterviews(demoInterviews));
  }, []);

  return (
    <main className="ml-64 p-8">
      <h1 className="text-3xl font-bold mb-8">Candidates</h1>
      <div className="grid gap-4">
        {interviews.map((interview) => (
          <div key={interview.id} className="glass-card p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{interview.title}</h3>
              <p className="text-sm text-slate-500 capitalize mt-1">
                Status: {interview.status.replace('_', ' ')} · ID: {interview.id.slice(0, 8)}
              </p>
            </div>
            {interview.trust_score != null ? (
              <TrustScoreGauge score={interview.trust_score} riskLevel={interview.risk_level} size="sm" />
            ) : (
              <span className="text-slate-400 text-sm">Not assessed</span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
