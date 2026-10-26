'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { Field, Icon } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { api, errorMessage, fieldErrors, type ConsumerSession, type PharmacySession } from '@/lib/api';

type Role = 'pharmacy' | 'consumer';
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO !== 'false';
const DEMO_PASSWORD = 'password123';
const DEMOS: Record<Role, { label: string; email: string }[]> = {
  pharmacy: [
    { label: 'Greenlife (verified)', email: 'greenlife@demo.test' },
    { label: 'Lifecare (verified)', email: 'lifecare@demo.test' },
    { label: 'MedPlus (verified)', email: 'medplus@demo.test' },
    { label: 'HealthPlus (verified)', email: 'healthplus@demo.test' },
    { label: 'CityCare (verified)', email: 'citycare@demo.test' },
    { label: 'TrustPharm (verified)', email: 'trustpharm@demo.test' },
    { label: 'Pending (unverified)', email: 'pending@demo.test' },
  ],
  consumer: [
    { label: 'Chidinma', email: 'chidinma@demo.test' },
    { label: 'Tunde', email: 'tunde@demo.test' },
  ],
};

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [role, setRole] = useState<Role>('pharmacy');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setErrs({});
    try {
      if (role === 'pharmacy') {
        const r = await api<Omit<PharmacySession, 'kind'>>('/auth/login', { method: 'POST', body: { email, password } });
        signIn({ kind: 'pharmacy', ...r });
        router.replace('/dashboard');
      } else {
        const r = await api<Omit<ConsumerSession, 'kind'>>('/consumer/auth/login', { method: 'POST', body: { email, password } });
        signIn({ kind: 'consumer', ...r });
        router.replace('/search');
      }
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your account to continue">
      <div role="tablist" aria-label="Account type" className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
        {(['pharmacy', 'consumer'] as Role[]).map((r) => (
          <button key={r} role="tab" aria-selected={role === r} type="button" onClick={() => { setRole(r); setError(''); }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-600 ${role === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
            <Icon name={r === 'pharmacy' ? 'package' : 'users'} className="mr-1.5 inline h-4 w-4" />{r === 'pharmacy' ? 'Pharmacy' : 'General User'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        <Field label="Email address" htmlFor="email" error={errs.email}>
          <input id="email" type="email" autoComplete="email" required placeholder={role === 'pharmacy' ? 'greenlife@demo.test' : 'chidinma@demo.test'} className={`input ${errs.email ? 'input-error' : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" error={errs.password}>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required placeholder="password123" className={`input pr-11 ${errs.password ? 'input-error' : ''}`} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500 hover:text-gray-700">
              <Icon name={show ? 'eyeOff' : 'eye'} className="h-5 w-5" />
            </button>
          </div>
        </Field>
        <button className="w-full cursor-pointer rounded-xl bg-brand-600 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
      </form>

      {SHOW_DEMO && (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500"><Icon name="help" className="h-3 w-3 text-gray-400" />Demo credentials — password for all accounts: <span className="normal-case text-gray-700">{DEMO_PASSWORD}</span></p>
          <div className="space-y-1">
            {DEMOS[role].map((d) => (
              <button key={d.email} type="button" className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-left text-xs text-gray-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700" onClick={() => { setEmail(d.email); setPassword(DEMO_PASSWORD); setError(''); }}>{d.label}<span className="ml-2 font-mono text-[11px] text-gray-400">{d.email}</span></button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-gray-600">New here? <Link href="/signup" className="font-medium text-brand-700 hover:underline">Create an account</Link></p>
    </AuthShell>
  );
}
