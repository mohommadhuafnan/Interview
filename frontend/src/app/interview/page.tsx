'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { api, Interview } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useBrowserMonitor } from '@/hooks/useBrowserMonitor';
import TrustScoreGauge from '@/components/TrustScoreGauge';
import {
  Camera, Mic, MicOff, Eye, AlertTriangle, Shield,
  ChevronRight, ChevronLeft, Monitor,
} from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface MonitoringState {
  gaze: string;
  gazeConfidence: number;
  suspiciousScore: number;
  headPose: string;
  faceCount: number;
  trustScore: number;
  riskLevel: string;
  alerts: string[];
}

export default function InterviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisInterval = useRef<NodeJS.Timeout | null>(null);

  const [interview, setInterview] = useState<Interview | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [code, setCode] = useState('function reverseLinkedList(head) {\n  // Your solution here\n  \n}');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [monitoring, setMonitoring] = useState<MonitoringState>({
    gaze: 'center',
    gazeConfidence: 0,
    suspiciousScore: 85,
    headPose: 'forward',
    faceCount: 1,
    trustScore: 85,
    riskLevel: 'low',
    alerts: [],
  });

  const { send } = useWebSocket({
    interviewId: interview?.id || '',
    enabled: !!interview,
    onMessage: () => {},
  });

  useBrowserMonitor({
    interviewId: interview?.id || '',
    enforceFullscreen: true,
    onTabSwitch: () => {
      setMonitoring((prev) => ({
        ...prev,
        alerts: ['Tab switch detected!', ...prev.alerts.slice(0, 4)],
        trustScore: Math.max(0, prev.trustScore - 5),
      }));
    },
  });

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user && !['candidate', 'admin', 'hr', 'interviewer'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      api.getInterviews().then((data) => {
        if (data.length > 0) {
          setInterview(data[0]);
          if (data[0].status === 'scheduled') {
            api.updateInterviewStatus(data[0].id, 'in_progress').catch(console.error);
          }
        }
      });
    }
  }, [user]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: micEnabled,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  }, [micEnabled]);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !interview || !cameraReady) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const image = canvas.toDataURL('image/jpeg', 0.7);

    try {
      const [gaze, headPose, multiPerson] = await Promise.all([
        api.analyzeGaze(interview.id, image),
        api.analyzeHeadPose(interview.id, image),
        api.analyzeMultiPerson(interview.id, image),
      ]);

      const metrics = {
        eye_movement: (gaze as { suspicious_score: number }).suspicious_score || 85,
        head_pose: (headPose as { suspicious: boolean }).suspicious ? 60 : 90,
        browser_activity: monitoring.trustScore > 70 ? 85 : 60,
        answer_originality: 88,
        voice_behavior: 90,
        multi_person: (multiPerson as { multiple_faces: boolean }).multiple_faces ? 30 : 95,
      };

      const trustResult = await api.calculateTrustScore(interview.id, metrics);

      const newState: MonitoringState = {
        gaze: (gaze as { direction: string }).direction || 'center',
        gazeConfidence: (gaze as { confidence: number }).confidence || 0,
        suspiciousScore: (gaze as { suspicious_score: number }).suspicious_score || 85,
        headPose: (headPose as { face_direction: string }).face_direction || 'forward',
        faceCount: (multiPerson as { face_count: number }).face_count || 1,
        trustScore: trustResult.trust_score,
        riskLevel: trustResult.risk_level,
        alerts: monitoring.alerts,
      };

      if ((gaze as { suspicious: boolean }).suspicious) {
        newState.alerts = [`Suspicious gaze: ${newState.gaze}`, ...newState.alerts.slice(0, 4)];
      }

      setMonitoring(newState);

      send({
        type: 'monitoring_update',
        payload: {
          gaze: newState.gaze,
          head_pose: newState.headPose,
          face_count: newState.faceCount,
          trust_score: newState.trustScore,
          tab_switches: 0,
        },
      });
    } catch (err) {
      console.error('Analysis error:', err);
    }
  }, [interview, cameraReady, monitoring.alerts, monitoring.trustScore, send]);

  useEffect(() => {
    if (cameraReady && interview) {
      analysisInterval.current = setInterval(captureAndAnalyze, 5000);
    }
    return () => {
      if (analysisInterval.current) clearInterval(analysisInterval.current);
    };
  }, [cameraReady, interview, captureAndAnalyze]);

  const submitAnswer = async () => {
    if (!interview) return;
    const questions = interview.questions || [];
    const question = questions[questionIndex] || '';

    if (answer.trim()) {
      try {
        const result = await api.analyzeAnswer(interview.id, question, answer);
        if (result.ai_probability > 0.5) {
          setMonitoring((prev) => ({
            ...prev,
            alerts: [`AI answer detected (${(result.ai_probability * 100).toFixed(0)}%)`, ...prev.alerts.slice(0, 4)],
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((i) => i + 1);
      setAnswer('');
    }
  };

  if (loading || !user) return null;

  const questions = interview?.questions || [
    'Explain the difference between REST and GraphQL.',
    'Describe a challenging bug you fixed recently.',
    'Implement a function to reverse a linked list.',
  ];
  const isCodingQuestion = questionIndex === 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-400" />
          <div>
            <h1 className="font-semibold">{interview?.title || 'Interview Session'}</h1>
            <p className="text-xs text-slate-400">AI Monitoring Active</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-300">REC</span>
          </div>
          <TrustScoreGauge score={monitoring.trustScore} riskLevel={monitoring.riskLevel} size="sm" />
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-4 p-4 h-[calc(100vh-73px)]">
        {/* Main content */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Question panel */}
          <div className="glass-panel bg-white/5 border-white/10 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-blue-300">
                Question {questionIndex + 1} of {questions.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setQuestionIndex(Math.max(0, questionIndex - 1))}
                  disabled={questionIndex === 0}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setQuestionIndex(Math.min(questions.length - 1, questionIndex + 1))}
                  disabled={questionIndex === questions.length - 1}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-4">{questions[questionIndex]}</h2>

            {isCodingQuestion ? (
              <div className="h-64 rounded-xl overflow-hidden border border-white/10">
                <MonacoEditor
                  height="100%"
                  language="javascript"
                  theme="vs-dark"
                  value={code}
                  onChange={(v) => setCode(v || '')}
                  options={{ minimap: { enabled: false }, fontSize: 14 }}
                />
              </div>
            ) : (
              <textarea
                className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                placeholder="Type your answer here..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            )}

            <button onClick={submitAnswer} className="btn-primary mt-4">
              {questionIndex < questions.length - 1 ? 'Next Question' : 'Submit Interview'}
            </button>
          </div>

          {/* Webcam */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-48">
            <video ref={videoRef} className="w-full h-full object-cover mirror" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <Camera className="w-12 h-12 text-slate-600" />
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className="p-2 rounded-lg bg-black/50 backdrop-blur"
              >
                {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-red-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Monitoring sidebar */}
        <div className="space-y-4 overflow-y-auto">
          <div className="glass-panel bg-white/5 border-white/10 p-4 rounded-xl">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" /> AI Monitoring
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Gaze Direction', value: monitoring.gaze, icon: Eye },
                { label: 'Confidence', value: `${monitoring.gazeConfidence.toFixed(0)}%`, icon: Shield },
                { label: 'Suspicious Score', value: `${monitoring.suspiciousScore}%`, icon: AlertTriangle },
                { label: 'Head Pose', value: monitoring.headPose, icon: Monitor },
                { label: 'Faces Detected', value: String(monitoring.faceCount), icon: Camera },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                  <span className="text-xs text-slate-400">{item.label}</span>
                  <span className="text-sm font-medium capitalize">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel bg-white/5 border-white/10 p-4 rounded-xl">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Live Alerts
            </h3>
            {monitoring.alerts.length === 0 ? (
              <p className="text-xs text-slate-500">No alerts — behavior normal</p>
            ) : (
              <div className="space-y-2">
                {monitoring.alerts.map((alert, i) => (
                  <div key={i} className="text-xs p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
                    {alert}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel bg-white/5 border-white/10 p-4 rounded-xl">
            <h3 className="font-semibold text-sm mb-2">Session Rules</h3>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Stay in fullscreen mode</li>
              <li>• Keep face visible to camera</li>
              <li>• Do not switch tabs</li>
              <li>• No external assistance</li>
              <li>• Answer questions independently</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  );
}
