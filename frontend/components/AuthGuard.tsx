'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingBlock } from './ui';

// Pharmacy-only. Consumers and signed-out visitors are sent to /login.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();
  const allowed = session?.kind === 'pharmacy';

  useEffect(() => {
    if (ready && !allowed) router.replace('/login');
  }, [ready, allowed, router]);

  if (!ready || !allowed) return <div className="min-h-screen"><LoadingBlock label="Checking your session…" /></div>;
  return <>{children}</>;
}
