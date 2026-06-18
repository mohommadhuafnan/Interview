'use client';

import { useEffect, useRef, useCallback } from 'react';
import { logSuspiciousEvent } from '@/lib/interview-session';

export function useSecurityLockdown(interviewId: string, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add('lockdown-mode');
    const blockContext = (e: Event) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
        e.preventDefault();
        logSuspiciousEvent(interviewId, 'devtools_attempt', 'high', 'Developer tools access attempted', 90);
      }
    };
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('keydown', blockKeys);
    return () => {
      document.body.classList.remove('lockdown-mode');
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('keydown', blockKeys);
    };
  }, [interviewId, enabled]);
}

export function useInterviewMonitor(interviewId: string) {
  const tabSwitches = useRef(0);

  const log = useCallback(
    (type: string, desc: string, severity = 'medium') => {
      logSuspiciousEvent(interviewId, type, severity, desc, 92);
    },
    [interviewId]
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        tabSwitches.current++;
        log('tab_switch', `Tab switch #${tabSwitches.current}`, 'high');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('copy', () => log('copy', 'Copy detected', 'medium'));
    document.addEventListener('paste', () => log('paste', 'Paste detected', 'medium'));
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [interviewId, log]);

  return { tabSwitches: tabSwitches.current };
}
