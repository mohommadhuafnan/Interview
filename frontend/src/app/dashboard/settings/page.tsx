'use client';

import { useState } from 'react';
import { Moon, Sun, Shield, Bell, Lock } from 'lucide-react';

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [lockdown, setLockdown] = useState(true);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <main className="ml-64 p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="glass-ios divide-y divide-white/20">
        {[
          { icon: darkMode ? Moon : Sun, label: 'Dark Mode', desc: 'iOS-style dark theme', value: darkMode, toggle: toggleDark },
          { icon: Bell, label: 'Dynamic Island Notifications', desc: 'Real-time candidate alerts', value: notifications, toggle: () => setNotifications(!notifications) },
          { icon: Lock, label: 'Browser Lockdown', desc: 'Disable copy/paste & dev tools during interviews', value: lockdown, toggle: () => setLockdown(!lockdown) },
          { icon: Shield, label: 'AI Proctoring', desc: 'Eye tracking, face detection, object detection', value: true, toggle: () => {} },
        ].map(({ icon: Icon, label, desc, value, toggle }) => (
          <div key={label} className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            </div>
            <button
              onClick={toggle}
              className={`w-12 h-7 rounded-full transition-all relative ${value ? 'bg-blue-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
