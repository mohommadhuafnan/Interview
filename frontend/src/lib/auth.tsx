'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getDashboardPath } from './api';
import { loginUser, registerUser, resolveCurrentUser } from './auth-service';
import type { User } from './types';
import { enableDemoMode, getDemoUser, DEMO_TOKEN } from './demo';
import { getSupabase } from './supabase';
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
    const init = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      if (token === DEMO_TOKEN) {
        setUser(getDemoUser());
        setLoading(false);
        return;
      }

      try {
        const profile = await resolveCurrentUser(token);
        if (profile) {
          setUser(profile);
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginUser(email, password);
    if (!res?.user?.role) {
      throw new Error('Login failed — user profile missing');
    }
    localStorage.setItem('token', res.access_token);
    localStorage.removeItem('demo_user');
    setUser(res.user);
    router.push(getDashboardPath(res.user.role));
  };

  const register = async (data: { email: string; password: string; full_name: string; role: string }) => {
    const res = await registerUser(data);
    if (!res?.user?.role) {
      throw new Error('Registration failed — user profile missing');
    }
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
    localStorage.removeItem('token');
    localStorage.removeItem('demo_user');
    getSupabase()?.auth.signOut().catch(() => {});
    setUser(null);
    router.push('/login');
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
