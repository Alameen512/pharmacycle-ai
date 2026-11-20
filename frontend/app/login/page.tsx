
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { Field, Icon } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  api,
  errorMessage,
  fieldErrors,
  type ConsumerSession,
  type PharmacySession,
} from '@/lib/api';

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

  function changeRole(nextRole: Role) {
    setRole(nextRole);
    setError('');
    setErrs({});
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);
    setError('');
    setErrs({});

    try {
      if (role === 'pharmacy') {
        const response = await api<Omit<PharmacySession, 'kind'>>(
          '/auth/login',
          {
            method: 'POST',
            body: { email, password },
          }
        );

        signIn({ kind: 'pharmacy', ...response });
        router.replace('/dashboard');
      } else {
        const response = await api<Omit<ConsumerSession, 'kind'>>(
          '/consumer/auth/login',
          {
            method: 'POST',
            body: { email, password },
          }
        );

        signIn({ kind: 'consumer', ...response });
        router.replace('/search');
      }
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  function selectDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError('');
    setErrs({});
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your PharmaCycle account."
    >
      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-gray-800">
          Choose your account type
        </p>

        <div
          role="tablist"
          aria-label="Account type"
          className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1.5"
        >
          {(['pharmacy', 'consumer'] as Role[]).map((item) => {
            const active = role === item;

            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeRole(item)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                  active
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'
                }`}
              >
                <Icon
                  name={item === 'pharmacy' ? 'package' : 'users'}
                  className="h-4 w-4"
                />
                {item === 'pharmacy' ? 'Pharmacy' : 'General User'}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs leading-5 text-gray-500">
          {role === 'pharmacy'
            ? 'Access your pharmacy dashboard, manage inventory and connect with partner pharmacies.'
            : 'Search for available medicines and send delivery requests to pharmacies.'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <Icon
              name="warningCircle"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>{error}</span>
          </div>
        )}

        <Field label="Email address" htmlFor="email" error={errs.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={`input ${errs.email ? 'input-error' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errs.password}>
          <div className="relative">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              className={`input pr-12 ${errs.password ? 'input-error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />

            <button
              type="button"
              onClick={() => setShow((current) => !current)}
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-gray-400 transition-colors hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600"
            >
              <Icon
                name={show ? 'eyeOff' : 'eye'}
                className="h-5 w-5"
              />
            </button>
          </div>
        </Field>

        <div className="-mt-2 flex justify-end">
          <Link
            href={`/forgot-password?type=${role}`}
            className="text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
            </>
          )}
        </button>
      </form>

      {SHOW_DEMO && (
        <section className="mt-7 rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
          <div className="mb-3 flex items-start gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Icon name="help" className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">
                Try a demo account
              </p>
              <p className="mt-0.5 text-xs leading-5 text-gray-500">
                Select an account to fill in its login details.
              </p>
            </div>
          </div>

          <div className="mb-3 rounded-lg bg-white px-3 py-2 text-xs text-gray-600">
            Demo password:{' '}
            <span className="font-mono font-semibold text-gray-900">
              {DEMO_PASSWORD}
            </span>
          </div>

          <div className="space-y-2">
            {DEMOS[role].map((demo) => (
              <button
                key={demo.email}
                type="button"
                disabled={busy}
                onClick={() => selectDemo(demo.email)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-gray-800">
                    {demo.label}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-gray-400">
                    {demo.email}
                  </span>
                </span>

                <Icon
                  name="chevronDown"
                  className="h-4 w-4 shrink-0 -rotate-90 text-gray-400"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-7 border-t border-gray-100 pt-6 text-center">
        <p className="text-sm text-gray-600">
          Don&apos;t have an account yet?{' '}
          <Link
            href="/signup"
            className="font-semibold text-brand-700 transition-colors hover:text-brand-800 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
