'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Video, Shield, Clock, CheckCircle } from 'lucide-react';
import { joinWaitingRoom, candidateRequestStart, subscribeToSession } from '@/lib/interview-session';
import { getDeviceFingerprint } from '@/lib/webrtc';
import { getSupabase } from '@/lib/supabase';

export default function JoinInterviewPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'form' | 'waiting' | 'ready'>('form');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState('');
  const [interviewId, setInterviewId] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { interview, session } = await joinWaitingRoom(token, name, email);
      setInterviewTitle(interview.title);
      setInterviewId(interview.id);
      setStep('waiting');

      const supabase = getSupabase();
      supabase?.channel('admin-notifications').send({
        type: 'broadcast',
        event: 'candidate-waiting',
        payload: {
          interviewId: interview.id,
          candidateName: name,
          title: interview.title,
          token,
        },
      });

      subscribeToSession(interview.id, (s) => {
        if (s.status === 'live') {
          router.push(`/interview/live/${interview.id}`);
        } else if (s.status === 'ready') {
          setStep('ready');
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRequest = async () => {
    await candidateRequestStart(interviewId);
    setStep('ready');

    const supabase = getSupabase();
    supabase?.channel('admin-notifications').send({
      type: 'broadcast',
      event: 'candidate-ready',
      payload: { interviewId, candidateName: name, title: interviewTitle },
    });
  };

  if (step === 'waiting' || step === 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-ios p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-6">
            {step === 'ready' ? (
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            ) : (
              <Clock className="w-10 h-10 text-blue-500 animate-pulse" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">{interviewTitle}</h1>
          <p className="text-slate-500 mb-6">
            {step === 'ready'
              ? 'Admin is starting the interview...'
              : 'You are in the waiting room. The interviewer will be notified.'}
          </p>

          {step === 'waiting' && (
            <button onClick={handleStartRequest} className="btn-liquid w-full mb-4">
              <Video className="w-5 h-5 inline mr-2" />
              Start Interview
            </button>
          )}

          <div className="glass-panel p-4 text-left text-sm space-y-2">
            <p className="font-medium text-slate-700">Before you begin:</p>
            <p>✓ Camera and microphone will be required</p>
            <p>✓ Screen sharing will be required</p>
            <p>✓ Full-screen mode will be enforced</p>
            <p>✓ AI proctoring will be active</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-ios p-10 max-w-md w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Join Interview</h1>
            <p className="text-sm text-slate-500">Enter your details to join the waiting room</p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-2xl bg-red-50 text-red-600 text-sm">{error}</div>}

        <form onSubmit={handleJoin} className="space-y-4">
          <input className="input-field" placeholder="Your Full Name *" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input-field" type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" disabled={loading} className="btn-liquid w-full">
            {loading ? 'Joining...' : 'Join Waiting Room'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
