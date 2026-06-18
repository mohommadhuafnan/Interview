'use client';

import { useEffect } from 'react';
import { enableDemoMode } from '@/lib/demo';

export default function DemoEntryPage() {
  useEffect(() => {
    enableDemoMode();
    window.location.href = '/dashboard';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500">Opening dashboard...</p>
    </div>
  );
}
