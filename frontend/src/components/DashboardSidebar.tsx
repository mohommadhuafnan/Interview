'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getDemoUser } from '@/lib/demo';
import {
  Shield, LayoutDashboard, Users, FileText, BarChart3,
  Monitor, LogOut, Settings, Bell,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/monitoring', label: 'Live Monitoring', icon: Monitor },
  { href: '/dashboard/interviews/create', label: 'Create Interview', icon: FileText },
  { href: '/dashboard/candidates', label: 'Candidates', icon: Users },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/resume', label: 'AI Resume', icon: Settings },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const displayName = user?.full_name ?? getDemoUser().full_name;
  const displayRole = user?.role ?? getDemoUser().role;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 glass-card rounded-none border-r border-slate-200/50 flex flex-col z-40">
      <div className="p-6 border-b border-slate-200/50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-800">InterviewGuard</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
              pathname === href
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200/50">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
            {displayName?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 capitalize">{displayRole}</p>
          </div>
          <Bell className="w-4 h-4 text-slate-400" />
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
