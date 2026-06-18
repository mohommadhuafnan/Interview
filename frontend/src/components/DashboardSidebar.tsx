'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getDemoUser } from '@/lib/demo';
import {
  Shield, LayoutDashboard, Users, FileText, BarChart3,
  Monitor, LogOut, Settings, Bell, Menu, X,
} from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

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

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const displayName = user?.full_name ?? getDemoUser().full_name;
  const displayRole = user?.role ?? getDemoUser().role;

  return (
    <>
      <div className="p-4 sm:p-6 border-b border-slate-200/50">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-800">InterviewGuard</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
              pathname === href || pathname.startsWith(`${href}/`)
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 sm:p-4 border-t border-slate-200/50">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
            {displayName?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 capitalize">{displayRole}</p>
          </div>
          <Bell className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
        <button
          onClick={() => { logout(); onNavigate?.(); }}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export default function DashboardSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-b border-slate-200/50 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-slate-800">InterviewGuard</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl bg-slate-100 text-slate-700"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {open && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 h-full w-72 max-w-[85vw] glass-card rounded-none border-r border-slate-200/50 flex flex-col z-50 transition-transform duration-300',
          'lg:translate-x-0 lg:w-64',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg bg-slate-100"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}

export function DashboardMain({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={clsx('pt-16 lg:pt-0 lg:ml-64 p-4 sm:p-6 min-h-screen', className)}>
      {children}
    </main>
  );
}
