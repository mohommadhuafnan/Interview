'use client';

import { SuspiciousEvent } from '@/lib/api';
import { AlertTriangle, Eye, Copy, Users, Mic, Monitor, Brain } from 'lucide-react';
import clsx from 'clsx';

const iconMap: Record<string, typeof AlertTriangle> = {
  gaze_anomaly: Eye,
  tab_switch: Monitor,
  visibility_hidden: Monitor,
  copy: Copy,
  paste: Copy,
  multi_person: Users,
  audio_anomaly: Mic,
  ai_generated_answer: Brain,
};

const severityColors: Record<string, string> = {
  low: 'border-l-emerald-400 bg-emerald-50/50',
  medium: 'border-l-amber-400 bg-amber-50/50',
  high: 'border-l-orange-400 bg-orange-50/50',
  critical: 'border-l-red-400 bg-red-50/50',
};

export default function EventTimeline({ events }: { events: SuspiciousEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No suspicious events recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {events.map((event) => {
        const Icon = iconMap[event.event_type] || AlertTriangle;
        return (
          <div
            key={event.id}
            className={clsx(
              'flex gap-3 p-4 rounded-xl border-l-4 transition-all hover:shadow-md',
              severityColors[event.severity] || severityColors.medium
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Icon className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800 capitalize">
                  {event.event_type.replace(/_/g, ' ')}
                </span>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full capitalize risk-' + event.severity)}>
                  {event.severity}
                </span>
              </div>
              <p className="text-sm text-slate-600">{event.description}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span>{new Date(event.created_at).toLocaleTimeString()}</span>
                <span>Confidence: {event.confidence}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
