'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Link2, Copy, Check, Plus } from 'lucide-react';
import { createInterviewWithInvite } from '@/lib/interview-session';

export default function CreateInterviewPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const qList = questions.split('\n').filter((q) => q.trim());
      const { interview, inviteLink: link } = await createInterviewWithInvite({
        title,
        questions: qList.length ? qList : ['Tell us about yourself.', 'Describe a technical challenge you solved.'],
      });
      setInviteLink(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create interview');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="max-w-7xl max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Create Interview</h1>
      <p className="text-slate-500 mb-8">Generate a Zoom-style invite link for your candidate</p>

      {error && <div className="mb-4 p-4 rounded-2xl bg-red-50 text-red-600">{error}</div>}

      {!inviteLink ? (
        <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleCreate} className="glass-ios p-8 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Interview Title</label>
            <input className="input-field" placeholder="Senior Software Engineer Interview" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Questions (one per line)</label>
            <textarea className="input-field h-32 resize-none" placeholder="Explain REST vs GraphQL&#10;Reverse a linked list&#10;System design question" value={questions} onChange={(e) => setQuestions(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-liquid w-full flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            {loading ? 'Creating...' : 'Create & Generate Link'}
          </button>
        </motion.form>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-ios p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-center mb-2">Interview Created!</h2>
          <p className="text-slate-500 text-center mb-6">Share this link with your candidate</p>

          <div className="glass-panel p-4 flex items-center gap-3 mb-6">
            <input readOnly value={inviteLink} className="flex-1 bg-transparent text-sm text-slate-700 outline-none" />
            <button onClick={copyLink} className="btn-liquid px-4 py-2 text-sm flex items-center gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.push('/dashboard/monitoring')} className="btn-secondary flex-1">
              Go to Monitoring
            </button>
            <button onClick={() => { setInviteLink(''); setTitle(''); setQuestions(''); }} className="btn-liquid flex-1">
              Create Another
            </button>
          </div>
        </motion.div>
      )}
    </main>
  );
}
