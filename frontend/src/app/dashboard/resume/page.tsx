'use client';

import { useState } from 'react';
import { Upload, Brain, Star, CheckCircle } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

export default function ResumeScreeningPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ai_score: number;
    skills: string[];
    experience_years: number;
    analysis_summary: string;
    recommendation: string;
  } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    // AI analysis simulation — connect OpenAI/HuggingFace for production
    await new Promise((r) => setTimeout(r, 2000));

    const mockResult = {
      ai_score: 82,
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'System Design'],
      experience_years: 4.5,
      analysis_summary: 'Strong full-stack background with relevant experience. Good project diversity. Recommended for technical interview.',
      recommendation: 'consider',
    };

    setResult(mockResult);

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('resume_screenings').insert({
        file_name: file.name,
        ai_score: mockResult.ai_score,
        skills: mockResult.skills,
        experience_years: mockResult.experience_years,
        analysis_summary: mockResult.analysis_summary,
        recommendation: mockResult.recommendation,
      });
    }

    setLoading(false);
  };

  return (
    <main className="ml-64 p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">AI Resume Screening</h1>
      <p className="text-slate-500 mb-8">Upload CV for AI-powered skill extraction and scoring</p>

      <div className="glass-ios p-8 mb-6">
        <div className="border-2 border-dashed border-blue-200 rounded-3xl p-12 text-center">
          <Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <p className="font-medium mb-2">Upload Resume (PDF, DOCX)</p>
          <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-slate-500" />
        </div>
        {file && (
          <button onClick={handleUpload} disabled={loading} className="btn-liquid w-full mt-4 flex items-center justify-center gap-2">
            <Brain className="w-5 h-5" />
            {loading ? 'Analyzing with AI...' : 'Analyze Resume'}
          </button>
        )}
      </div>

      {result && (
        <div className="glass-ios p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Analysis Results</h2>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-2xl font-bold">{result.ai_score}%</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500 mb-2">Extracted Skills</p>
            <div className="flex flex-wrap gap-2">
              {result.skills.map((s) => (
                <span key={s} className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">{s}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4">
              <p className="text-sm text-slate-500">Experience</p>
              <p className="text-xl font-bold">{result.experience_years} years</p>
            </div>
            <div className="glass-panel p-4">
              <p className="text-sm text-slate-500">Recommendation</p>
              <p className="text-xl font-bold capitalize text-amber-600">{result.recommendation}</p>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed">{result.analysis_summary}</p>

          <div className="flex gap-3">
            <button className="btn-liquid-green flex-1 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Hire
            </button>
            <button className="btn-secondary flex-1">Consider</button>
            <button className="btn-liquid-red flex-1">Reject</button>
          </div>
        </div>
      )}
    </main>
  );
}
