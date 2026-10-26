'use client';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Kind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: Kind; message: string };
type Ctx = { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };

const ToastContext = createContext<Ctx | null>(null);
let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Kind, message: string) => {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);
  const value = useMemo(() => ({ success: (m: string) => push('success', m), error: (m: string) => push('error', m), info: (m: string) => push('info', m) }), [push]);
  const tone = { success: 'border-brand-200 bg-brand-50 text-brand-900', error: 'border-red-200 bg-red-50 text-red-900', info: 'border-blue-200 bg-blue-50 text-blue-900' };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-sm ${tone[t.kind]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastContext);
  if (!c) throw new Error('useToast must be used inside ToastProvider');
  return c;
}
