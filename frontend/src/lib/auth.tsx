'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api, getDashboardPath } from './api';
import type { User } from './types';
import { enableDemoMode, getDemoUser, DEMO_TOKEN } from './demo';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; role: string }) => Promise<void>;
  demoLogin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token || token === DEMO_TOKEN) {
      if (!token) enableDemoMode();
      setUser(getDemoUser());
      setLoading(false);
      return;
    }

    api.me()
      .then(setUser)
      .catch(() => {
        enableDemoMode();
        setUser(getDemoUser());
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('token', res.access_token);
    localStorage.removeItem('demo_user');
    setUser(res.user);
    router.push(getDashboardPath(res.user.role));
  };

  const register = async (data: { email: string; password: string; full_name: string; role: string }) => {
    const res = await api.register(data);
    localStorage.setItem('token', res.access_token);
    localStorage.removeItem('demo_user');
    setUser(res.user);
    router.push(getDashboardPath(res.user.role));
  };

  const demoLogin = useCallback(() => {
    enableDemoMode();
    setUser(getDemoUser());
    setLoading(false);
    router.replace('/dashboard');
  }, [router]);

  const logout = () => {
    enableDemoMode();
    setUser(getDemoUser());
    router.push('/dashboard');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
