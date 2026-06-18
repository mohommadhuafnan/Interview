'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, Video, AlertTriangle } from 'lucide-react';

export interface IslandNotification {
  id: string;
  title: string;
  message: string;
  type: 'join' | 'start' | 'alert' | 'info';
  action?: { label: string; onClick: () => void };
}

let addNotificationGlobal: ((n: Omit<IslandNotification, 'id'>) => void) | null = null;

export function pushNotification(n: Omit<IslandNotification, 'id'>) {
  addNotificationGlobal?.(n);
}

export default function DynamicIsland() {
  const [notifications, setNotifications] = useState<IslandNotification[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const add = useCallback((n: Omit<IslandNotification, 'id'>) => {
    const id = crypto.randomUUID();
    setNotifications((prev) => [...prev, { ...n, id }]);
    setExpanded(id);
    setTimeout(() => {
      setExpanded(null);
      setTimeout(() => setNotifications((prev) => prev.filter((x) => x.id !== id)), 400);
    }, 6000);
  }, []);

  useEffect(() => {
    addNotificationGlobal = add;
    return () => { addNotificationGlobal = null; };
  }, [add]);

  const current = notifications[notifications.length - 1];
  if (!current) return null;

  const icons = {
    join: User,
    start: Video,
    alert: AlertTriangle,
    info: Bell,
  };
  const Icon = icons[current.type];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
      <AnimatePresence>
        <motion.div
          key={current.id}
          initial={{ scale: 0.8, opacity: 0, y: -20 }}
          animate={{
            scale: 1,
            opacity: 1,
            y: 0,
            width: expanded === current.id ? 360 : 180,
          }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="glass-ios overflow-hidden cursor-pointer"
          onClick={() => setExpanded(expanded === current.id ? null : current.id)}
          style={{ borderRadius: 28, minHeight: 44 }}
        >
          <div className="flex items-center gap-3 px-5 py-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            {expanded === current.id ? (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{current.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{current.message}</p>
                {current.action && (
                  <button
                    onClick={(e) => { e.stopPropagation(); current.action?.onClick(); }}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {current.action.label} →
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-700 truncate">{current.title}</p>
            )}
            {current.type === 'join' && <span className="live-dot shrink-0" />}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
