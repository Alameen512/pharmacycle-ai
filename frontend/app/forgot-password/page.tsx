
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { Field, Icon } from '@/components/ui';
import { api, errorMessage, fieldErrors } from '@/lib/api';

type Role = 'pharmacy' | 'consumer';

export default function ForgotPasswordPage() {
  const [role, setRole] = useState<Role>('pharmacy');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');

    if (type === 'pharmacy' || type === 'consumer') {
      setRole(type);
    }
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);
    setError('');
    setErrs({});
    setSent(false);

    try {
      await api('/password-reset/request', {
        method: 'POST',
        body: {
          email: email.trim(),
          accountType: role,
        },
      });

      setSent(true);
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email address associated with your account and we'll send reset instructions if an account matches."
    >
      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-gray-800">
          Account type
        </p>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1.5">
          {(['pharmacy', 'consumer'] as Role[]).map((item) => {
            const active = role === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setRole(item);
                  setSent(false);
                  setError('');
                  setErrs({});
                }}
                className={`min-h-12 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'
                }`}
              >
                {item === 'pharmacy' ? 'Pharmacy' : 'General User'}
              </button>
            );
          })}
        </div>
      </div>

      {sent ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon name="check" className="h-5 w-5" />
          </div>

          <h2 className="text-base font-bold text-gray-900">
            Check your email
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            If an account matches the details you provided and email delivery
            is available, reset instructions will arrive shortly. Check your
            spam folder too.
          </p>

          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
          >
            Try another email address
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <Field label="Email address" htmlFor="email" error={errs.email}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
              className={`input ${errs.email ? 'input-error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Sending...
              </>
            ) : (
              <>
                Send reset instructions
                <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-7 border-t border-gray-100 pt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
        >
          <Icon name="chevronDown" className="h-4 w-4 rotate-90" />
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
