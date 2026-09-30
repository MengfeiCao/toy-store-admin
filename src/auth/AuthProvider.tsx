import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { toAppError } from '../lib/app-error';
import { supabase } from '../lib/supabase';
import type { AuthContextValue, UserProfile } from './auth.types';

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, status, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const applySession = async (session: Session | null) => {
      if (!mounted) return;
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const nextProfile = await loadProfile(session.user.id);
        if (!mounted) return;
        if (!nextProfile || nextProfile.status === 'disabled') {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setError('账号已停用');
          setLoading(false);
          return;
        }
        setUser(session.user);
        setProfile(nextProfile);
        setError(null);
        setLoading(false);
      } catch (cause) {
        if (!mounted) return;
        setUser(null);
        setProfile(null);
        setError(toAppError(cause).message);
        setLoading(false);
      }
    };

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        setError(toAppError(sessionError).message);
        setLoading(false);
        return;
      }
      void applySession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    error,
    async signIn(email, password) {
      setError(null);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw toAppError(signInError);
      await applyAuthenticatedSession(data.session);
    },
    async signOut() {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw toAppError(signOutError);
      setUser(null);
      setProfile(null);
    },
  }), [error, loading, profile, user]);

  async function applyAuthenticatedSession(session: Session | null) {
    if (!session?.user) throw new Error('登录未返回有效会话');
    const nextProfile = await loadProfile(session.user.id);
    if (!nextProfile || nextProfile.status === 'disabled') {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setError('账号已停用');
      throw new Error('账号已停用');
    }
    setUser(session.user);
    setProfile(nextProfile);
    setError(null);
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return context;
}
