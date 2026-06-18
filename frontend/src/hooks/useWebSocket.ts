'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseWebSocketOptions {
  interviewId: string;
  onMessage?: (data: Record<string, unknown>) => void;
  enabled?: boolean;
}

export function useWebSocket({ interviewId, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    if (!enabled || !interviewId) return;

    const token = localStorage.getItem('token') || '';
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const clientId = `client_${Date.now()}`;
    const url = `${wsUrl}/ws/${clientId}?token=${token}&interview_id=${interviewId}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current?.(data);
      } catch {}
    };

    const ping = setInterval(() => send({ type: 'ping' }), 30000);

    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, [interviewId, enabled, send]);

  return { connected, send };
}
