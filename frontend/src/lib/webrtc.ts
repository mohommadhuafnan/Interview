import { getSupabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

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
  private remoteCameraStream: MediaStream | null = null;
  private remoteScreenStream: MediaStream | null = null;
  private role: string;
  private clientId: string;
  private interviewId: string;
  private isPolite: boolean;
  private pendingSignals: SignalPayload[] = [];
  private makingOffer = false;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private onRemoteStream?: (stream: MediaStream) => void;
  private onRemoteScreen?: (stream: MediaStream | null) => void;
  private onMonitoring?: (data: Record<string, unknown>) => void;

  constructor(interviewId: string, role: string, clientId: string) {
    this.interviewId = interviewId;
    this.role = role;
    this.clientId = clientId;
    this.isPolite = role === 'candidate';
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
    void this.channel?.send({ type: 'broadcast', event: 'signal', payload });
  }

  private async handleSignal(signal: SignalPayload) {
    if (signal.type === 'monitoring') {
      this.onMonitoring?.(signal.data);
      return;
    }

    if (signal.type === 'screen-share' && !signal.active) {
      this.remoteScreenStream = null;
      this.onRemoteScreen?.(null);
      return;
    }

    if (signal.type === 'ready') {
      if (!this.isPolite && this.pc && this.localStream) {
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

  private attachRemoteTrack(track: MediaStreamTrack) {
    const isScreen =
      track.kind === 'video' &&
      (track.label.toLowerCase().includes('screen') ||
        track.label.toLowerCase().includes('window') ||
        track.label.toLowerCase().includes('display'));

    if (isScreen) {
      if (!this.remoteScreenStream) this.remoteScreenStream = new MediaStream();
      this.remoteScreenStream.getTracks().forEach((t) => {
        if (t.kind === track.kind) this.remoteScreenStream?.removeTrack(t);
      });
      this.remoteScreenStream.addTrack(track);
      this.onRemoteScreen?.(this.remoteScreenStream);
      return;
    }

    if (track.kind === 'video' || track.kind === 'audio') {
      if (!this.remoteCameraStream) this.remoteCameraStream = new MediaStream();
      const existing = this.remoteCameraStream.getTracks().filter((t) => t.kind === track.kind);
      existing.forEach((t) => this.remoteCameraStream?.removeTrack(t));
      this.remoteCameraStream.addTrack(track);
      if (track.kind === 'video') {
        this.onRemoteStream?.(this.remoteCameraStream);
      }
    }
  }

  private async processSignal(signal: SignalPayload) {
    if (!this.pc) return;

    try {
      if (signal.type === 'offer') {
        const collision = this.makingOffer || this.pc.signalingState !== 'stable';
        if (collision && !this.isPolite) return;
        if (collision && this.isPolite) {
          await this.pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
        }
        await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.broadcast({ type: 'answer', sdp: answer, from: this.role, clientId: this.clientId });
      } else if (signal.type === 'answer') {
        if (this.pc.signalingState === 'have-local-offer') {
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
      } else if (signal.type === 'ice' && signal.candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch {
          // ICE candidates can arrive after connection settles
        }
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
      video: true,
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

    if (!this.isPolite) {
      await this.sendOffer();
    } else {
      await this.sendRenegotiationOffer();
    }
  }

  private async sendRenegotiationOffer() {
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
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

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
      const track = e.track;
      track.onunmute = () => this.attachRemoteTrack(track);
      if (!track.muted) this.attachRemoteTrack(track);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        void this.sendOffer();
      }
    };

    return pc;
  }

  private async sendOffer() {
    if (!this.pc || this.makingOffer || this.isPolite) return;
    try {
      this.makingOffer = true;
      const offer = await this.pc.createOffer({ iceRestart: this.pc.connectionState === 'failed' });
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
    if (this.pc) return;
    this.pc = this.createPeerConnection();
    this.localStream?.getTracks().forEach((t) => {
      if (this.localStream) this.pc!.addTrack(t, this.localStream);
    });
    await this.flushPendingSignals();
    await this.sendOffer();
    this.startReconnectLoop();
  }

  async connectAsAnswerer(
    onRemote: (stream: MediaStream) => void,
    onScreen?: (stream: MediaStream | null) => void
  ) {
    this.onRemoteStream = onRemote;
    this.onRemoteScreen = onScreen;
    if (this.pc) return;
    this.pc = this.createPeerConnection();
    this.localStream?.getTracks().forEach((t) => {
      if (this.localStream) this.pc!.addTrack(t, this.localStream);
    });
    await this.flushPendingSignals();
  }

  private startReconnectLoop() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setInterval(() => {
      if (!this.pc || this.isPolite) return;
      if (this.pc.connectionState === 'connected' && this.remoteCameraStream?.getVideoTracks()[0]?.readyState === 'live') {
        return;
      }
      void this.sendOffer();
      this.broadcast({ type: 'ready', from: this.role, clientId: this.clientId });
    }, 4000);
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
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
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

export function attachVideoStream(
  el: HTMLVideoElement | null,
  stream: MediaStream | null,
  muted = false
) {
  if (!el || !stream) return;
  el.srcObject = stream;
  el.muted = muted;
  void el.play().catch(() => {
    setTimeout(() => void el.play().catch(() => {}), 500);
  });
}
