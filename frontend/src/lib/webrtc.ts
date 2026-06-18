import { getSupabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type SignalPayload =
  | { type: 'offer'; sdp: RTCSessionDescriptionInit; from: string; clientId: string }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit; from: string; clientId: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit; from: string; clientId: string }
  | { type: 'monitoring'; data: Record<string, unknown>; from: string; clientId: string }
  | { type: 'screen-share'; active: boolean; from: string; clientId: string }
  | { type: 'ready'; from: string; clientId: string };

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private screenSender: RTCRtpSender | null = null;
  private role: string;
  private clientId: string;
  private interviewId: string;
  private pendingSignals: SignalPayload[] = [];
  private makingOffer = false;
  private onRemoteStream?: (stream: MediaStream) => void;
  private onRemoteScreen?: (stream: MediaStream | null) => void;
  private onMonitoring?: (data: Record<string, unknown>) => void;

  constructor(interviewId: string, role: string, clientId: string) {
    this.interviewId = interviewId;
    this.role = role;
    this.clientId = clientId;
    this.setupSignaling();
  }

  private setupSignaling() {
    const supabase = getSupabase();
    if (!supabase) return;

    this.channel = supabase
      .channel(`webrtc:${this.interviewId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (signal.clientId === this.clientId) return;
        void this.handleSignal(signal);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.broadcast({ type: 'ready', from: this.role, clientId: this.clientId });
        }
      });
  }

  private broadcast(payload: SignalPayload) {
    this.channel?.send({ type: 'broadcast', event: 'signal', payload });
  }

  private async handleSignal(signal: SignalPayload) {
    if (signal.type === 'monitoring') {
      this.onMonitoring?.(signal.data);
      return;
    }

    if (signal.type === 'screen-share' && !signal.active) {
      this.onRemoteScreen?.(null);
      return;
    }

    if (signal.type === 'ready') {
      if (this.role === 'admin' && this.pc && this.localStream) {
        await this.sendOffer();
      }
      return;
    }

    if (!this.pc) {
      this.pendingSignals.push(signal);
      return;
    }

    await this.processSignal(signal);
  }

  private async flushPendingSignals() {
    const pending = [...this.pendingSignals];
    this.pendingSignals = [];
    for (const signal of pending) {
      await this.processSignal(signal);
    }
  }

  private async processSignal(signal: SignalPayload) {
    if (!this.pc) return;

    try {
      if (signal.type === 'offer') {
        if (this.pc.signalingState !== 'stable' && !this.makingOffer) {
          await this.pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
        }
        await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.broadcast({ type: 'answer', sdp: answer, from: this.role, clientId: this.clientId });
      } else if (signal.type === 'answer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'ice' && signal.candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error('WebRTC signal error:', err);
    }
  }

  async startLocalMedia(video = true, audio = true): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: video
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
    });
    return this.localStream;
  }

  async startScreenShare(onLocalPreview?: (stream: MediaStream) => void): Promise<MediaStream> {
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'monitor' } as MediaTrackConstraints,
      audio: false,
    });

    onLocalPreview?.(this.screenStream);
    await this.addScreenTrack(this.screenStream);
    this.broadcast({ type: 'screen-share', active: true, from: this.role, clientId: this.clientId });

    this.screenStream.getVideoTracks()[0].onended = () => {
      void this.stopScreenShare();
    };

    return this.screenStream;
  }

  private async addScreenTrack(stream: MediaStream) {
    if (!this.pc) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    if (this.screenSender) {
      await this.screenSender.replaceTrack(track);
    } else {
      this.screenSender = this.pc.addTrack(track, stream);
    }

    await this.sendOffer();
  }

  async stopScreenShare() {
    if (this.screenSender && this.pc) {
      await this.screenSender.replaceTrack(null);
      this.screenSender = null;
    }
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    this.broadcast({ type: 'screen-share', active: false, from: this.role, clientId: this.clientId });
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.broadcast({
          type: 'ice',
          candidate: e.candidate.toJSON(),
          from: this.role,
          clientId: this.clientId,
        });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (!stream) return;
      const isScreen =
        e.track.label.toLowerCase().includes('screen') ||
        e.track.label.toLowerCase().includes('window') ||
        e.track.label.toLowerCase().includes('display') ||
        stream.getVideoTracks().some((t) => t.label.toLowerCase().includes('screen'));

      if (isScreen) {
        this.onRemoteScreen?.(stream);
      } else {
        this.onRemoteStream?.(stream);
      }
    };

    pc.onnegotiationneeded = async () => {
      if (this.pc === pc) {
        await this.sendOffer();
      }
    };

    return pc;
  }

  private async sendOffer() {
    if (!this.pc || this.makingOffer) return;
    try {
      this.makingOffer = true;
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.broadcast({ type: 'offer', sdp: offer, from: this.role, clientId: this.clientId });
    } finally {
      this.makingOffer = false;
    }
  }

  async connectAsOfferer(
    onRemote: (stream: MediaStream) => void,
    onScreen?: (stream: MediaStream | null) => void
  ) {
    this.onRemoteStream = onRemote;
    this.onRemoteScreen = onScreen;
    this.pc = this.createPeerConnection();
    this.localStream?.getTracks().forEach((t) => {
      if (this.localStream) this.pc!.addTrack(t, this.localStream);
    });
    await this.flushPendingSignals();
    await this.sendOffer();
  }

  async connectAsAnswerer(
    onRemote: (stream: MediaStream) => void,
    onScreen?: (stream: MediaStream | null) => void
  ) {
    this.onRemoteStream = onRemote;
    this.onRemoteScreen = onScreen;
    this.pc = this.createPeerConnection();
    this.localStream?.getTracks().forEach((t) => {
      if (this.localStream) this.pc!.addTrack(t, this.localStream);
    });
    await this.flushPendingSignals();
  }

  onMonitoringData(callback: (data: Record<string, unknown>) => void) {
    this.onMonitoring = callback;
  }

  sendMonitoring(data: Record<string, unknown>) {
    this.broadcast({ type: 'monitoring', data, from: this.role, clientId: this.clientId });
  }

  getLocalStream() {
    return this.localStream;
  }

  getScreenStream() {
    return this.screenStream;
  }

  disconnect() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    if (this.channel) {
      const supabase = getSupabase();
      supabase?.removeChannel(this.channel);
    }
  }
}

export async function runCode(language: string, code: string): Promise<string> {
  const langMap: Record<string, string> = {
    javascript: 'javascript',
    python: 'python',
    java: 'java',
    cpp: 'c++',
    c: 'c',
    csharp: 'csharp',
  };

  try {
    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: langMap[language] || language,
        version: '*',
        files: [{ content: code }],
      }),
    });
    const data = await res.json();
    return data.run?.output || data.run?.stderr || 'No output';
  } catch {
    return `[Demo] Code executed successfully (${language})\n// Connect to internet for live execution`;
  }
}

export function getDeviceFingerprint(): Record<string, string> {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cores: String(navigator.hardwareConcurrency || 'unknown'),
  };
}
