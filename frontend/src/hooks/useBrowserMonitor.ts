'use client';

import { useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

interface BrowserMonitorOptions {
  interviewId: string;
  onTabSwitch?: () => void;
  enforceFullscreen?: boolean;
}

export function useBrowserMonitor({
  interviewId,
  onTabSwitch,
  enforceFullscreen = true,
}: BrowserMonitorOptions) {
  const tabSwitchCount = useRef(0);

  const logEvent = useCallback(
    (eventType: string, details: Record<string, unknown> = {}) => {
      api.logBrowserEvent(interviewId, eventType, details).catch(console.error);
    },
    [interviewId]
  );

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        tabSwitchCount.current++;
        logEvent('visibility_hidden', { count: tabSwitchCount.current });
        onTabSwitch?.();
      }
    };

    const handleBlur = () => logEvent('blur');
    const handleCopy = () => logEvent('copy');
    const handlePaste = (e: ClipboardEvent) =>
      logEvent('paste', { text: e.clipboardData?.getData('text')?.slice(0, 100) });

    const handleFullscreen = () => {
      if (enforceFullscreen && !document.fullscreenElement) {
        logEvent('fullscreen_exit');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('fullscreenchange', handleFullscreen);

    if (enforceFullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [interviewId, logEvent, onTabSwitch, enforceFullscreen]);

  return { tabSwitchCount: tabSwitchCount.current };
}
