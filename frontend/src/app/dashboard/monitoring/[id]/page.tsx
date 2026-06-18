'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Monitor, Play, Square, MessageSquare,
  Shield, AlertTriangle, Wifi, Share2, MonitorOff, Code2,
} from 'lucide-react';
import { WebRTCManager, attachVideoStream } from '@/lib/webrtc';
import {
  adminStartInterview, getSession, subscribeToSession,
  sendChatMessage, subscribeToChat, getChatMessages,
  type InterviewSession,
} from '@/lib/interview-session';
import { subscribeLiveCode, fetchLatestCode } from '@/lib/live-coding';
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
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const [events, setEvents] = useState<SuspiciousEvent[]>([]);
  const [timer, setTimer] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender_name: string; message: string; sender_role: string }>>([]);
  const [candidateCode, setCandidateCode] = useState('// Waiting for candidate to type code...');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeOutput, setCodeOutput] = useState('');
  const [recommendation] = useState('consider');

  const onRemoteVideo = useCallback((stream: MediaStream) => {
    attachVideoStream(remoteVideoRef.current, stream, false);
    if (stream.getVideoTracks().length > 0) {
      setRemoteConnected(true);
    }
  }, []);

  const onRemoteScreen = useCallback((stream: MediaStream | null) => {
    if (stream) {
      attachVideoStream(screenVideoRef.current, stream, false);
      setScreenActive(true);
    } else {
      setScreenActive(false);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    getSession(interviewId).then((s) => {
      setSession(s);
      if (s?.status === 'live') setIsLive(true);
    });
    return subscribeToSession(interviewId, (s) => {
      setSession(s);
      if (s.status === 'live') setIsLive(true);
    });
  }, [interviewId]);

  useEffect(() => {
    fetchLatestCode(interviewId).then((latest) => {
      if (!latest) return;
      setCandidateCode(latest.code);
      setCodeLanguage(latest.language);
      if (latest.output) setCodeOutput(latest.output);
    });
    return subscribeLiveCode(interviewId, (payload) => {
      setCandidateCode(payload.code);
      setCodeLanguage(payload.language);
      if (payload.output !== undefined) setCodeOutput(payload.output);
    });
  }, [interviewId]);

  useEffect(() => {
    const webrtc = new WebRTCManager(interviewId, 'admin', `admin-${interviewId}`);
    webrtcRef.current = webrtc;
    webrtc.onMonitoringData(setMetrics);

    (async () => {
      try {
        const stream = await webrtc.startLocalMedia(true, true);
        attachVideoStream(localVideoRef.current, stream, true);
        await webrtc.connectAsOfferer(onRemoteVideo, onRemoteScreen);
      } catch (err) {
        console.error('Media error:', err);
      }
    })();

    return () => webrtc.disconnect();
  }, [interviewId, onRemoteVideo, onRemoteScreen]);

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
    setTimer(0);
  };

  const toggleScreenShare = async () => {
    const webrtc = webrtcRef.current;
    if (!webrtc) return;

    if (sharingScreen) {
      await webrtc.stopScreenShare();
      setSharingScreen(false);
      return;
    }

    try {
      await webrtc.startScreenShare();
      setSharingScreen(true);
    } catch {
      setSharingScreen(false);
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
    <div className="max-w-[1600px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Live Monitoring</h1>
          <p className="text-slate-500 text-sm">{candidateName} · {session?.status || 'waiting'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isLive && (
            <>
              <span className="live-pill text-xs sm:text-sm"><span className="live-dot" /> LIVE · {formatTime(timer)}</span>
              <span className={`text-xs sm:text-sm ${remoteConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                <Wifi className="w-4 h-4 inline mr-1" />
                {remoteConnected ? 'Both cameras connected' : 'Connecting candidate camera...'}
              </span>
            </>
          )}
          {isLive && (
            <button
              type="button"
              onClick={toggleScreenShare}
              className="btn-secondary text-sm flex items-center gap-2 px-3 py-2"
            >
              {sharingScreen ? <MonitorOff className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {sharingScreen ? 'Stop Share' : 'Share Screen'}
            </button>
          )}
          {!isLive ? (
            <button onClick={handleStartInterview} className="btn-liquid-green flex items-center gap-2 text-sm">
              <Play className="w-4 h-4" /> Start Interview
            </button>
          ) : (
            <button onClick={() => router.push('/dashboard/monitoring')} className="btn-liquid-red flex items-center gap-2 text-sm">
              <Square className="w-4 h-4" /> End Session
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-ios p-2 overflow-hidden">
              <p className="text-xs text-slate-500 px-2 py-1">Candidate Camera</p>
              <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative">
                <video ref={remoteVideoRef} className="w-full h-full object-cover" playsInline autoPlay />
                {!remoteConnected && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs sm:text-sm text-center px-4">
                    Waiting for candidate camera — ensure candidate opened the live interview page
                  </div>
                )}
              </div>
            </div>
            <div className="glass-ios p-2 overflow-hidden">
              <p className="text-xs text-slate-500 px-2 py-1">Your Camera</p>
              <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden">
                <video ref={localVideoRef} className="w-full h-full object-cover mirror" muted playsInline autoPlay />
              </div>
            </div>
          </div>

          <div className="glass-ios p-2">
            <p className="text-xs text-slate-500 px-2 py-1 flex items-center gap-2">
              <Monitor className="w-3 h-3" /> Candidate Screen Share
            </p>
            <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative">
              <video ref={screenVideoRef} className="w-full h-full object-contain" playsInline autoPlay />
              {!screenActive && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs sm:text-sm text-center px-4">
                  Ask candidate to click Share Screen in their interview room
                </div>
              )}
            </div>
          </div>

          <div className="glass-ios p-4">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Code2 className="w-4 h-4" /> Candidate Code (Live)
            </p>
            <div className="h-48 sm:h-56 rounded-2xl overflow-hidden border border-white/20">
              <MonacoEditor
                height="100%"
                language={codeLanguage === 'cpp' ? 'cpp' : codeLanguage}
                theme="vs-dark"
                value={candidateCode}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, automaticLayout: true }}
              />
            </div>
            {codeOutput && (
              <pre className="mt-3 p-3 rounded-xl bg-slate-900 text-emerald-400 text-xs overflow-auto max-h-28">{codeOutput}</pre>
            )}
          </div>

          <div className="glass-ios p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Live Chat</p>
            <div className="h-28 sm:h-32 overflow-y-auto space-y-2 mb-3">
              {messages.map((m, i) => (
                <div key={i} className={`text-sm p-2 rounded-xl max-w-[85%] ${m.sender_role === 'admin' ? 'bg-blue-100 ml-auto' : 'bg-slate-100'}`}>
                  <span className="text-xs text-slate-400">{m.sender_name}: </span>{m.message}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input-field flex-1 text-sm" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="Message candidate..." />
              <button onClick={sendChat} className="btn-liquid px-4 text-sm shrink-0">Send</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-ios p-4 sm:p-6 flex flex-col items-center">
            <TrustScoreGauge score={trustScore} riskLevel={trustScore >= 80 ? 'low' : trustScore >= 60 ? 'medium' : 'high'} />
            <p className="text-sm text-slate-500 mt-2 text-center">AI Recommendation:
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
    </div>
  );
}
