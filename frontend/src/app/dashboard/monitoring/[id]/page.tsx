'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Video, Mic, Monitor, Play, Square, MessageSquare,
  Shield, AlertTriangle, Eye, Clock, Wifi,
} from 'lucide-react';
import { WebRTCManager, runCode } from '@/lib/webrtc';
import {
  adminStartInterview, getSession, subscribeToSession,
  sendChatMessage, subscribeToChat, getChatMessages,
  type InterviewSession,
} from '@/lib/interview-session';
import { pushNotification } from '@/components/DynamicIsland';
import TrustScoreGauge from '@/components/TrustScoreGauge';
import EventTimeline from '@/components/EventTimeline';
import type { SuspiciousEvent } from '@/lib/types';
import { getSupabase } from '@/lib/supabase';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function LiveMonitoringPage() {
  const { id: interviewId } = useParams<{ id: string }>();
  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const [events, setEvents] = useState<SuspiciousEvent[]>([]);
  const [timer, setTimer] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender_name: string; message: string; sender_role: string }>>([]);
  const [candidateCode, setCandidateCode] = useState('// Waiting for candidate code...');
  const [recommendation] = useState('consider');

  useEffect(() => {
    getSession(interviewId).then(setSession);
    return subscribeToSession(interviewId, setSession);
  }, [interviewId]);

  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => setTimer((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  useEffect(() => {
    getChatMessages(interviewId).then(setMessages);
    return subscribeToChat(interviewId, (msg) => {
      setMessages((prev) => [...prev, msg as typeof messages[0]]);
    });
  }, [interviewId]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`webrtc:${interviewId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        const signal = payload as { type: string; data?: Record<string, unknown> };
        if (signal.type === 'monitoring' && signal.data) {
          setMetrics(signal.data);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [interviewId]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    supabase
      .from('suspicious_events')
      .select('*')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setEvents((data as SuspiciousEvent[]) || []));

    const channel = supabase
      .channel(`events:${interviewId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suspicious_events', filter: `interview_id=eq.${interviewId}` },
        (payload) => setEvents((prev) => [payload.new as SuspiciousEvent, ...prev]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [interviewId]);

  const handleStartInterview = async () => {
    await adminStartInterview(interviewId);
    setIsLive(true);

    const webrtc = new WebRTCManager(interviewId, 'admin', `admin-${interviewId}`);
    webrtcRef.current = webrtc;

    try {
      const stream = await webrtc.startLocalMedia(true, true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play();
      }
      await webrtc.connectAsOfferer((remote) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
          remoteVideoRef.current.play();
        }
      });
    } catch (err) {
      console.error('Media error:', err);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    await sendChatMessage(interviewId, 'admin', 'Interviewer', 'admin', chatInput);
    setChatInput('');
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const trustScore = (metrics.suspiciousScore as number) || 78;
  const candidateName = session?.candidate_name || 'Candidate';

  return (
    <main className="ml-64 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Live Monitoring</h1>
          <p className="text-slate-500">{candidateName} · {session?.status || 'waiting'}</p>
        </div>
        <div className="flex items-center gap-3">
          {isLive && (
            <>
              <span className="live-pill"><span className="live-dot" /> LIVE · {formatTime(timer)}</span>
              <span className="flex items-center gap-1 text-sm text-emerald-600"><Wifi className="w-4 h-4" /> Good</span>
            </>
          )}
          {!isLive ? (
            <button onClick={handleStartInterview} className="btn-liquid-green flex items-center gap-2">
              <Play className="w-4 h-4" /> Start Interview
            </button>
          ) : (
            <button onClick={() => router.push('/dashboard/monitoring')} className="btn-liquid-red flex items-center gap-2">
              <Square className="w-4 h-4" /> End Session
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Video feeds */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-ios p-2 overflow-hidden">
              <p className="text-xs text-slate-500 px-2 py-1">Candidate Camera</p>
              <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative">
                <video ref={remoteVideoRef} className="w-full h-full object-cover" playsInline />
                {!isLive && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                    Waiting for candidate video...
                  </div>
                )}
              </div>
            </div>
            <div className="glass-ios p-2 overflow-hidden">
              <p className="text-xs text-slate-500 px-2 py-1">Your Camera</p>
              <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden">
                <video ref={localVideoRef} className="w-full h-full object-cover mirror" muted playsInline />
              </div>
            </div>
          </div>

          <div className="glass-ios p-2">
            <p className="text-xs text-slate-500 px-2 py-1 flex items-center gap-2"><Monitor className="w-3 h-3" /> Candidate Screen</p>
            <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 text-sm">
              {isLive ? 'Screen share stream active' : 'Screen share will appear when interview starts'}
            </div>
          </div>

          {/* Code view */}
          <div className="glass-ios p-4">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Eye className="w-4 h-4" /> Candidate Code (Live)</p>
            <div className="h-48 rounded-2xl overflow-hidden border border-white/20">
              <MonacoEditor height="100%" language="javascript" theme="vs-dark" value={candidateCode}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }} />
            </div>
          </div>

          {/* Chat */}
          <div className="glass-ios p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Live Chat</p>
            <div className="h-32 overflow-y-auto space-y-2 mb-3">
              {messages.map((m, i) => (
                <div key={i} className={`text-sm p-2 rounded-xl max-w-xs ${m.sender_role === 'admin' ? 'bg-blue-100 ml-auto' : 'bg-slate-100'}`}>
                  <span className="text-xs text-slate-400">{m.sender_name}: </span>{m.message}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input-field flex-1 text-sm" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="Message candidate..." />
              <button onClick={sendChat} className="btn-liquid px-4 text-sm">Send</button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="glass-ios p-6 flex flex-col items-center">
            <TrustScoreGauge score={trustScore} riskLevel={trustScore >= 80 ? 'low' : trustScore >= 60 ? 'medium' : 'high'} />
            <p className="text-sm text-slate-500 mt-2">AI Recommendation:
              <span className={`ml-1 font-semibold capitalize ${recommendation === 'hire' ? 'text-emerald-600' : recommendation === 'reject' ? 'text-red-600' : 'text-amber-600'}`}>
                {recommendation}
              </span>
            </p>
          </div>

          <div className="glass-ios p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" /> Live AI Metrics
            </h3>
            {[
              { label: 'Gaze Direction', value: String(metrics.gaze || '—') },
              { label: 'Head Pose', value: String(metrics.headPose || '—') },
              { label: 'Face Detected', value: metrics.faceDetected ? 'Yes' : '—' },
              { label: 'Suspicious Score', value: metrics.suspiciousScore ? `${metrics.suspiciousScore}%` : '—' },
            ].map((m) => (
              <div key={m.label} className="flex justify-between p-2 rounded-xl bg-slate-50 mb-1 text-sm">
                <span className="text-slate-500">{m.label}</span>
                <span className="font-medium capitalize">{m.value}</span>
              </div>
            ))}
          </div>

          <div className="glass-ios p-4 max-h-64 overflow-y-auto">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Suspicious Events
            </h3>
            <EventTimeline events={events} />
          </div>
        </div>
      </div>
    </main>
  );
}
