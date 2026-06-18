'use client';

import { useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { logSuspiciousEvent } from '@/lib/interview-session';

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
  const pasteCount = useRef(0);
  const copyCount = useRef(0);

  const logEvent = useCallback(
    (eventType: string, details: Record<string, unknown> = {}) => {
      api.logBrowserEvent(interviewId, eventType, details).catch(console.error);
      logSuspiciousEvent(
        interviewId,
        eventType,
        eventType.includes('tab') || eventType.includes('visibility') ? 'high' : 'medium',
        `Browser activity: ${eventType}`,
        92
      ).catch(console.error);
    },
    [interviewId]
  );

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        tabSwitchCount.current++;
        logEvent('tab_switch', { count: tabSwitchCount.current, reason: 'visibility_hidden' });
        logEvent('visibility_hidden', { count: tabSwitchCount.current });
        onTabSwitch?.();
      }
    };

    const handleBlur = () => logEvent('blur', { reason: 'window_blur' });
    const handleCopy = () => {
      copyCount.current++;
      logEvent('copy', { count: copyCount.current });
    };
    const handlePaste = (e: ClipboardEvent) => {
      pasteCount.current++;
      logEvent('paste', {
        count: pasteCount.current,
        text: e.clipboardData?.getData('text')?.slice(0, 100),
      });
    };

    const handleFullscreen = () => {
      if (enforceFullscreen && !document.fullscreenElement) {
        logEvent('fullscreen_exit');
        logEvent('window_minimize', { reason: 'fullscreen_exit' });
      }
    };

    const handleResize = () => {
      if (window.innerHeight < screen.height * 0.75) {
        logEvent('window_minimize', { innerHeight: window.innerHeight });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('fullscreenchange', handleFullscreen);
    window.addEventListener('resize', handleResize);

    if (enforceFullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      window.removeEventListener('resize', handleResize);
    };
  }, [interviewId, logEvent, onTabSwitch, enforceFullscreen]);

  return {
    tabSwitchCount: tabSwitchCount.current,
    copyCount: copyCount.current,
    pasteCount: pasteCount.current,
  };
}
