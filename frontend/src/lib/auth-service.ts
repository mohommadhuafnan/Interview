import { getSupabase, isSupabaseConfigured } from './supabase';
import { api } from './api';
import type { User } from './types';

export interface AuthResult {
  access_token: string;
  user: User;
}

async function loadProfile(userId: string, email: string): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const byId = await supabase
    .from('users')
    .select('id,email,full_name,role')
    .eq('id', userId)
    .maybeSingle();

  if (byId.data) return byId.data as User;

  const byEmail = await supabase
    .from('users')
    .select('id,email,full_name,role')
    .eq('email', email)
    .maybeSingle();

  return (byEmail.data as User | null) ?? null;
}

async function syncUserProfile(
  userId: string,
  email: string,
  fullName: string,
  role: string
): Promise<User> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase.from('users').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role,
      password_hash: 'supabase-auth',
    },
    { onConflict: 'email' }
  );

  if (error) throw new Error(error.message);

  return { id: userId, email, full_name: fullName, role: role as User['role'] };
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase()!;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error && data.session?.access_token && data.user) {
      let profile = await loadProfile(data.user.id, email);
      if (!profile && data.user.user_metadata) {
        profile = await syncUserProfile(
          data.user.id,
          email,
          String(data.user.user_metadata.full_name || email.split('@')[0]),
          String(data.user.user_metadata.role || 'candidate')
        );
      }
      if (profile) {
        return { access_token: data.session.access_token, user: profile };
      }
    }
  }

  return api.login(email, password);
}

export async function registerUser(data: {
  email: string;
  password: string;
  full_name: string;
  role: string;
}): Promise<AuthResult> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase()!;
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name, role: data.role },
      },
    });

    if (error) {
      if (!error.message.toLowerCase().includes('already registered')) {
        throw new Error(error.message);
      }
    } else if (authData.user) {
      const user = await syncUserProfile(
        authData.user.id,
        data.email,
        data.full_name,
        data.role
      );

      if (authData.session?.access_token) {
        return { access_token: authData.session.access_token, user };
      }

      const login = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (login.data.session?.access_token) {
        return { access_token: login.data.session.access_token, user };
      }
    }
  }

  return api.register(data);
}

export async function resolveCurrentUser(token: string): Promise<User | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase()!;
    const { data } = await supabase.auth.getUser(token);
    if (data.user) {
      const profile = await loadProfile(data.user.id, data.user.email || '');
      if (profile) return profile;
    }
  }

  try {
    return await api.me();
  } catch {
    return null;
  }
}
