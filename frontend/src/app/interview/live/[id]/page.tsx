'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  MessageSquare, Code, Pen, Shield, AlertTriangle,
} from 'lucide-react';
import { WebRTCManager, runCode, getDeviceFingerprint } from '@/lib/webrtc';
import { useProctoring } from '@/hooks/useProctoring';
import { useSecurityLockdown, useInterviewMonitor } from '@/hooks/useSecurityLockdown';
import { saveCodeSubmission, sendChatMessage, subscribeToChat, getChatMessages } from '@/lib/interview-session';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', template: 'console.log("Hello World");' },
  { id: 'python', label: 'Python', template: 'print("Hello World")' },
  { id: 'java', label: 'Java', template: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}' },
  { id: 'cpp', label: 'C++', template: '#include <iostream>\nint main() { std::cout << "Hello"; return 0; }' },
  { id: 'c', label: 'C', template: '#include <stdio.h>\nint main() { printf("Hello"); return 0; }' },
  { id: 'csharp', label: 'C#', template: 'using System;\nclass Program { static void Main() { Console.WriteLine("Hello"); } }' },
];

export default function LiveInterviewPage() {
  const { id: interviewId } = useParams<{ id: string }>();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);

  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [tab, setTab] = useState<'video' | 'code' | 'chat' | 'whiteboard'>('video');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender_name: string; message: string; sender_role: string }>>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const [alerts, setAlerts] = useState<string[]>([]);
  const [timer, setTimer] = useState(0);
  const [connected, setConnected] = useState(false);

  useSecurityLockdown(interviewId, true);
  useInterviewMonitor(interviewId);

  const onMetrics = useCallback((m: Record<string, unknown>) => {
    setMetrics(m);
    webrtcRef.current?.sendMonitoring(m);
    if ((m.suspiciousScore as number) < 60) {
      setAlerts((prev) => [`Suspicious gaze: ${m.gaze}`, ...prev.slice(0, 3)]);
    }
  }, []);

  useProctoring(interviewId, localVideoRef, camOn, onMetrics);

  useEffect(() => {
    const t = setInterval(() => setTimer((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getChatMessages(interviewId).then(setMessages);
    return subscribeToChat(interviewId, (msg) => {
      setMessages((prev) => [...prev, msg as typeof messages[0]]);
    });
  }, [interviewId]);

  useEffect(() => {
    const webrtc = new WebRTCManager(interviewId, 'candidate', `candidate-${interviewId}`);
    webrtcRef.current = webrtc;

    (async () => {
      try {
        const stream = await webrtc.startLocalMedia(true, true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play();
        }
        await webrtc.connectAsAnswerer((remote) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remote;
            remoteVideoRef.current.play();
            setConnected(true);
          }
        });
        await webrtc.startScreenShare().then(() => setScreenOn(true)).catch(() => {});
      } catch (err) {
        setAlerts((prev) => ['Camera/mic access required', ...prev]);
      }
    })();

    return () => webrtc.disconnect();
  }, [interviewId]);

  const toggleCam = () => {
    const stream = webrtcRef.current?.getLocalStream();
    stream?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setCamOn(!camOn);
  };

  const toggleMic = () => {
    const stream = webrtcRef.current?.getLocalStream();
    stream?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setMicOn(!micOn);
  };

  const handleRunCode = async () => {
    setRunning(true);
    const result = await runCode(language, code);
    setOutput(result);
    await saveCodeSubmission(interviewId, language, code, result);
    setRunning(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    await sendChatMessage(interviewId, 'candidate', 'Candidate', 'candidate', chatInput);
    setChatInput('');
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white lockdown-mode">
      <header className="glass-ios mx-4 mt-4 px-6 py-3 flex items-center justify-between !bg-black/40 !border-white/10">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="font-semibold">Live Interview</span>
          <span className="live-pill"><span className="live-dot" /> LIVE</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">⏱ {formatTime(timer)}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {connected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-4 p-4 h-[calc(100vh-90px)]">
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Tab bar */}
          <div className="flex gap-2">
            {[
              { id: 'video', icon: Video, label: 'Video' },
              { id: 'code', icon: Code, label: 'Code Editor' },
              { id: 'chat', icon: MessageSquare, label: 'Chat' },
              { id: 'whiteboard', icon: Pen, label: 'Whiteboard' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id as typeof tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  tab === id ? 'bg-blue-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {tab === 'video' && (
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="relative rounded-3xl overflow-hidden bg-black aspect-video">
                <video ref={localVideoRef} className="w-full h-full object-cover mirror" muted playsInline />
                <span className="absolute bottom-3 left-3 text-xs bg-black/50 px-2 py-1 rounded-full">You</span>
                {!camOn && <div className="absolute inset-0 bg-slate-800 flex items-center justify-center"><VideoOff className="w-12 h-12 text-slate-600" /></div>}
              </div>
              <div className="relative rounded-3xl overflow-hidden bg-black aspect-video">
                <video ref={remoteVideoRef} className="w-full h-full object-cover" playsInline />
                <span className="absolute bottom-3 left-3 text-xs bg-black/50 px-2 py-1 rounded-full">Interviewer</span>
              </div>
            </div>
          )}

          {tab === 'code' && (
            <div className="flex-1 flex flex-col gap-3 glass-ios !bg-black/30 !border-white/10 p-4">
              <div className="flex items-center gap-3">
                <select className="input-field !bg-white/10 !text-white !border-white/20 max-w-xs" value={language}
                  onChange={(e) => { setLanguage(e.target.value); setCode(LANGUAGES.find((l) => l.id === e.target.value)?.template || ''); }}>
                  {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
                <button onClick={handleRunCode} disabled={running} className="btn-liquid-green text-sm px-4 py-2">
                  {running ? 'Running...' : '▶ Run Code'}
                </button>
              </div>
              <div className="flex-1 min-h-[300px] rounded-2xl overflow-hidden border border-white/10">
                <MonacoEditor height="100%" language={language === 'cpp' ? 'cpp' : language} theme="vs-dark" value={code}
                  onChange={(v) => setCode(v || '')} options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }} />
              </div>
              {output && (
                <pre className="glass-panel !bg-black/40 p-4 text-sm text-emerald-400 rounded-2xl overflow-auto max-h-32">{output}</pre>
              )}
            </div>
          )}

          {tab === 'chat' && (
            <div className="flex-1 flex flex-col glass-ios !bg-black/30 p-4">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.map((m, i) => (
                  <div key={i} className={`p-3 rounded-2xl max-w-xs ${m.sender_role === 'admin' ? 'bg-blue-500/20 ml-auto' : 'bg-white/10'}`}>
                    <p className="text-xs text-slate-400 mb-1">{m.sender_name}</p>
                    <p className="text-sm">{m.message}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input-field flex-1 !bg-white/10 !text-white !border-white/20" value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="Type a message..." />
                <button onClick={sendChat} className="btn-liquid px-4">Send</button>
              </div>
            </div>
          )}

          {tab === 'whiteboard' && (
            <Whiteboard />
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={toggleMic} className={`w-12 h-12 rounded-full flex items-center justify-center ${micOn ? 'bg-white/15' : 'bg-red-500'}`}>
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button onClick={toggleCam} className={`w-12 h-12 rounded-full flex items-center justify-center ${camOn ? 'bg-white/15' : 'bg-red-500'}`}>
              {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button onClick={() => setScreenOn(!screenOn)} className={`w-12 h-12 rounded-full flex items-center justify-center ${screenOn ? 'bg-blue-500' : 'bg-white/15'}`}>
              {screenOn ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* AI Monitoring sidebar */}
        <div className="space-y-4 overflow-y-auto">
          <div className="glass-ios !bg-black/30 !border-white/10 p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" /> AI Proctoring
            </h3>
            {[
              { label: 'Gaze', value: String(metrics.gaze || 'center') },
              { label: 'Head Pose', value: String(metrics.headPose || 'forward') },
              { label: 'Face Detected', value: metrics.faceDetected ? 'Yes' : 'No' },
              { label: 'Trust Score', value: `${metrics.suspiciousScore || 85}%` },
              { label: 'Confidence', value: `${metrics.confidence || 0}%` },
            ].map((item) => (
              <div key={item.label} className="flex justify-between p-2 rounded-xl bg-white/5 mb-1 text-sm">
                <span className="text-slate-400">{item.label}</span>
                <span className="font-medium capitalize">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="glass-ios !bg-black/30 !border-white/10 p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Alerts
            </h3>
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-500">No alerts — behavior normal</p>
            ) : alerts.map((a, i) => (
              <div key={i} className="text-xs p-2 rounded-xl bg-amber-500/10 text-amber-300 mb-1">{a}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const start = (e: MouseEvent) => { drawing.current = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
    const draw = (e: MouseEvent) => { if (!drawing.current) return; ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); };
    const stop = () => { drawing.current = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stop);
    return () => { canvas.removeEventListener('mousedown', start); canvas.removeEventListener('mousemove', draw); canvas.removeEventListener('mouseup', stop); };
  }, []);

  return (
    <div className="flex-1 glass-ios !bg-white !border-white/20 p-2 rounded-3xl">
      <canvas ref={canvasRef} className="w-full rounded-2xl cursor-crosshair" style={{ height: 400 }} />
    </div>
  );
}
