'use client';

import { useEffect, useState } from 'react';
import { api, Interview } from '@/lib/api';
import { demoInterviews } from '@/lib/demo';
import { FileText, Download } from 'lucide-react';

export default function ReportsPage() {
  const [interviews, setInterviews] = useState<Interview[]>(demoInterviews);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    api.getInterviews().then(setInterviews).catch(() => setInterviews(demoInterviews));
  }, []);

  const handleGenerate = async (interviewId: string) => {
    setGenerating(interviewId);
    try {
      await api.generateReport(interviewId);
      alert('Report generated (demo mode). Connect backend for PDF download.');
    } catch {
      alert('Demo mode: Report preview ready. Connect backend for PDF download.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <main className="ml-64 p-8">
      <h1 className="text-3xl font-bold mb-8">Reports</h1>
      <div className="grid gap-4">
        {interviews.map((interview) => (
          <div key={interview.id} className="glass-card p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">{interview.title}</h3>
                <p className="text-sm text-slate-500">
                  Trust Score: {interview.trust_score ?? 'N/A'}% · {interview.status}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleGenerate(interview.id)}
              disabled={generating === interview.id}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              {generating === interview.id ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
