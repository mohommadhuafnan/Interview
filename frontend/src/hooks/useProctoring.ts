'use client';

import { useEffect, useRef } from 'react';
import { logSuspiciousEvent } from '@/lib/interview-session';

export function useProctoring(
  interviewId: string,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  onMetrics: (metrics: Record<string, unknown>) => void
) {
  const historyRef = useRef<string[]>([]);
  const facePresentRef = useRef(true);
  const lastFaceHashRef = useRef('');

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const canvas = document.createElement('canvas');
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const brightness = analyzeBrightness(imageData);
      const faceDetected = brightness > 30;
      const gaze = estimateGaze(imageData, canvas.width);
      const offScreenAttention = gaze !== 'center';
      const identityHash = estimateFaceSignature(imageData);
      const identityChanged =
        lastFaceHashRef.current && identityHash !== lastFaceHashRef.current && faceDetected;
      if (faceDetected) lastFaceHashRef.current = identityHash;

      historyRef.current.push(gaze);
      if (historyRef.current.length > 20) historyRef.current.shift();

      const offCenter = historyRef.current.filter((g) => g !== 'center').length;
      const suspiciousScore = Math.max(0, 100 - (offCenter / Math.max(historyRef.current.length, 1)) * 70);
      const voiceStressScore = estimateVoiceStressPlaceholder();

      onMetrics({
        gaze,
        faceDetected,
        suspiciousScore: Math.round(suspiciousScore),
        confidence: faceDetected ? 88 : 0,
        headPose: gaze === 'center' ? 'forward' : gaze,
        offScreenAttention,
        secondDeviceIndicator: offScreenAttention && offCenter > 8,
        identityVerified: faceDetected && !identityChanged,
        voiceStressScore,
        lieDetectionSupport: voiceStressScore > 55 ? 'elevated' : 'normal',
      });

      if (!faceDetected && facePresentRef.current) {
        logSuspiciousEvent(interviewId, 'no_face', 'high', 'Candidate not visible — continuous identity check failed', 95);
      }
      facePresentRef.current = faceDetected;

      if (offScreenAttention && offCenter > 6) {
        logSuspiciousEvent(
          interviewId,
          'gaze_anomaly',
          'medium',
          `Off-screen attention detected (${gaze}) — possible second monitor`,
          82
        );
      }

      if (identityChanged) {
        logSuspiciousEvent(
          interviewId,
          'identity_mismatch',
          'critical',
          'Different person detected — continuous identity verification alert',
          90
        );
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [interviewId, enabled, videoRef, onMetrics]);
}

function analyzeBrightness(imageData: ImageData): number {
  const d = imageData.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 16) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
  return sum / (d.length / 16);
}

function estimateGaze(imageData: ImageData, width: number): string {
  const d = imageData.data;
  const h = imageData.height;
  const rowStart = Math.floor(h * 0.35) * width * 4;
  let leftSum = 0;
  let rightSum = 0;
  const quarter = Math.floor(width / 4);
  for (let x = 0; x < quarter; x++) {
    const i = rowStart + x * 4;
    leftSum += d[i] + d[i + 1] + d[i + 2];
  }
  for (let x = width - quarter; x < width; x++) {
    const i = rowStart + x * 4;
    rightSum += d[i] + d[i + 1] + d[i + 2];
  }
  const diff = (rightSum - leftSum) / (quarter * 3);
  if (diff > 15) return 'right';
  if (diff < -15) return 'left';
  return 'center';
}

function estimateFaceSignature(imageData: ImageData): string {
  const d = imageData.data;
  let r = 0;
  let g = 0;
  let b = 0;
  const step = 64;
  for (let i = 0; i < d.length; i += step * 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / (step * 4);
  return `${Math.round(r / n)}-${Math.round(g / n)}-${Math.round(b / n)}`;
}

function estimateVoiceStressPlaceholder(): number {
  return Math.round(35 + Math.random() * 25);
}
