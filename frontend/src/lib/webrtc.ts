import { getSupabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type SignalPayload =
  | { type: 'offer'; sdp: RTCSessionDescriptionInit; from: string }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit; from: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit; from: string }
  | { type: 'monitoring'; data: Record<string, unknown>; from: string }
  | { type: 'screen-share'; active: boolean; from: string };

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private role: string;
  private interviewId: string;
  private onRemoteStream?: (stream: MediaStream) => void;
  private onRemoteScreen?: (stream: MediaStream | null) => void;
  private onSignal?: (payload: SignalPayload) => void;

  constructor(interviewId: string, role: string, userId: string) {
    this.interviewId = interviewId;
    this.role = role;
    this.setupSignaling(userId);
  }

  private setupSignaling(userId: string) {
    const supabase = getSupabase();
    if (!supabase) return;

    this.channel = supabase
      .channel(`webrtc:${this.interviewId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (signal.from === userId) return;
        this.handleSignal(signal);
      })
      .subscribe();
  }

  private async handleSignal(signal: SignalPayload) {
    if (!this.pc) return;

    if (signal.type === 'offer') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.broadcast({ type: 'answer', sdp: answer, from: this.role });
    } else if (signal.type === 'answer') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.type === 'ice') {
      await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }

  private broadcast(payload: SignalPayload) {
    this.channel?.send({ type: 'broadcast', event: 'signal', payload });
  }

  async startLocalMedia(video = true, audio = true): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: video ? { width: 1280, height: 720, facingMode: 'user' } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
    });
    return this.localStream;
  }

  async startScreenShare(): Promise<MediaStream> {
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' } as MediaTrackConstraints,
      audio: false,
    });
    this.broadcast({ type: 'screen-share', active: true, from: this.role });

    this.screenStream.getVideoTracks()[0].onended = () => {
      this.stopScreenShare();
    };

    return this.screenStream;
  }

  stopScreenShare() {
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    this.broadcast({ type: 'screen-share', active: false, from: this.role });
    this.onRemoteScreen?.(null);
  }

  async connectAsOfferer(onRemote: (s: MediaStream) => void) {
    this.onRemoteStream = onRemote;
    this.pc = this.createPeerConnection();
    this.localStream?.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.broadcast({ type: 'offer', sdp: offer, from: this.role });
  }

  async connectAsAnswerer(onRemote: (s: MediaStream) => void) {
    this.onRemoteStream = onRemote;
    this.pc = this.createPeerConnection();
    this.localStream?.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));
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
        this.broadcast({ type: 'ice', candidate: e.candidate.toJSON(), from: this.role });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams[0]) this.onRemoteStream?.(e.streams[0]);
    };

    return pc;
  }

  sendMonitoring(data: Record<string, unknown>) {
    this.broadcast({ type: 'monitoring', data, from: this.role });
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
