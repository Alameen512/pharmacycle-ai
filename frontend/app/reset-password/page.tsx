
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { Field, Icon } from '@/components/ui';
import { api, errorMessage, fieldErrors } from '@/lib/api';

type Role = 'pharmacy' | 'consumer';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [role, setRole] = useState<Role>('pharmacy');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token') || '';
    const queryType = params.get('type');

    setToken(queryToken);

    if (queryType === 'pharmacy' || queryType === 'consumer') {
      setRole(queryType);
    }

    if (!queryToken || (queryType !== 'pharmacy' && queryType !== 'consumer')) {
      setInvalidLink(true);
    }
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy || invalidLink) return;

    setError('');
    setErrs({});

    const nextErrors: Record<string, string> = {};

    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    } else if (password.length > 72) {
      nextErrors.password = 'Password must not exceed 72 characters.';
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      nextErrors.password = 'Use at least one letter and one number.';
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrs(nextErrors);
      return;
    }

    setBusy(true);

    try {
      await api('/password-reset/confirm', {
        method: 'POST',
        body: {
          token,
          accountType: role,
          password,
        },
      });

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={success ? 'Password updated' : 'Create a new password'}
      subtitle={
        success
          ? 'Your PharmaCycle account password has been changed.'
          : 'Choose a new password for your account.'
      }
    >
      {success ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon name="check" className="h-5 w-5" />
          </div>

          <h2 className="text-base font-bold text-gray-900">
            Password reset successful
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            You can now sign in using your new password.
          </p>

          <Link
            href="/login"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Continue to sign in
            <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
          </Link>
        </div>
      ) : invalidLink ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
        >
          <h2 className="font-bold text-gray-900">
            Invalid password reset link
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            This link is incomplete or invalid. Request a new password reset
            link to continue.
          </p>
          <Link
            href="/forgot-password"
            className="mt-5 inline-flex text-sm font-semibold text-brand-700 hover:underline"
          >
            Request another reset link
          </Link>
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

          <Field label="New password" htmlFor="password" error={errs.password}>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                placeholder="Enter your new password"
                className={`input pr-12 ${errs.password ? 'input-error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-gray-400 hover:text-brand-700"
              >
                <Icon
                  name={showPassword ? 'eyeOff' : 'eye'}
                  className="h-5 w-5"
                />
              </button>
            </div>
          </Field>

          <p className="-mt-3 text-xs leading-5 text-gray-500">
            Use at least 8 characters, including a letter and a number.
          </p>

          <Field
            label="Confirm new password"
            htmlFor="confirmPassword"
            error={errs.confirmPassword}
          >
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="Enter your new password again"
                className={`input pr-12 ${
                  errs.confirmPassword ? 'input-error' : ''
                }`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((value) => !value)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-gray-400 hover:text-brand-700"
              >
                <Icon
                  name={showConfirm ? 'eyeOff' : 'eye'}
                  className="h-5 w-5"
                />
              </button>
            </div>
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Updating password...
              </>
            ) : (
              <>
                Reset password
                <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
              </>
            )}
          </button>
        </form>
      )}

      {!success && (
        <div className="mt-7 border-t border-gray-100 pt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
