'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, readSession, writeSession, type ConsumerSession, type PharmacySession, type Session } from '@/lib/api';

type Ctx = {
  session: Session | null;
  ready: boolean;
  signIn: (s: Session) => void;
  signOut: () => void;
  refresh: () => Promise<void>;
  setConsumerLocation: (city: string | null, state: string | null) => void;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(() => {
    writeSession(null);
    setSession(null);
  }, []);
  const signIn = useCallback((s: Session) => {
    writeSession(s);
    setSession(s);
  }, []);

  const refresh = useCallback(async () => {
    const s = readSession();
    if (!s) return;
    try {
      if (s.kind === 'pharmacy') {
        const me = await api<{ user: PharmacySession['user']; pharmacy: PharmacySession['pharmacy'] }>('/auth/me', { auth: true });
        const next: PharmacySession = { ...s, user: me.user, pharmacy: me.pharmacy };
        writeSession(next);
        setSession(next);
      } else {
        const me = await api<{ consumer: ConsumerSession['consumer'] }>('/consumer/me', { auth: true });
        const next: ConsumerSession = { ...s, consumer: me.consumer };
        writeSession(next);
        setSession(next);
      }
    } catch {
      /* 401s are handled by the unauthorized event; other errors keep the cached session */
    }
  }, []);

  useEffect(() => {
    const s = readSession();
    setSession(s);
    setReady(true);
    if (s) void refresh();
    const onUnauthorized = () => signOut();
    window.addEventListener('pharmacycle:unauthorized', onUnauthorized);
    return () => window.removeEventListener('pharmacycle:unauthorized', onUnauthorized);
  }, [refresh, signOut]);

  const setConsumerLocation = useCallback((city: string | null, state: string | null) => {
    setSession((cur) => {
      if (!cur || cur.kind !== 'consumer') return cur;
      const next = { ...cur, consumer: { ...cur.consumer, city, state } };
      writeSession(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ session, ready, signIn, signOut, refresh, setConsumerLocation }), [session, ready, signIn, signOut, refresh, setConsumerLocation]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
