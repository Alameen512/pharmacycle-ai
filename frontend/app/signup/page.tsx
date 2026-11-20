
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
import { NIGERIAN_STATES } from '@/lib/format';

type Role = 'pharmacy' | 'consumer';

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [role, setRole] = useState<Role>('pharmacy');
  const [f, setF] = useState({
    pharmacyName: '',
    name: '',
    email: '',
    password: '',
    city: '',
    state: '',
    address: '',
    phone: '',
  });

  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});

  const set =
    (key: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setF((previous) => ({
        ...previous,
        [key]: e.target.value,
      }));

      if (errs[key]) {
        setErrs((previous) => {
          const next = { ...previous };
          delete next[key];
          return next;
        });
      }
    };

  const cls = (key: string) =>
    `input ${errs[key] ? 'input-error' : ''}`;

  function changeRole(nextRole: Role) {
    setRole(nextRole);
    setErrs({});
    setError('');
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) return;

    const local: Record<string, string> = {};

    if (role === 'pharmacy' && f.pharmacyName.trim().length < 2) {
      local.pharmacyName = 'Enter the pharmacy name.';
    }

    if (f.name.trim().length < 2) {
      local.name = 'Enter your full name.';
    }

    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) {
      local.email = 'Enter a valid email address.';
    }

    if (
      f.password.length < 8 ||
      !/[A-Za-z]/.test(f.password) ||
      !/\d/.test(f.password)
    ) {
      local.password =
        'Use at least 8 characters with a letter and a number.';
    }

    if (role === 'pharmacy') {
      if (f.city.trim().length < 2) {
        local.city = 'Enter a city.';
      }

      if (!f.state) {
        local.state = 'Select a state.';
      }
    }

    if (Object.keys(local).length > 0) {
      setErrs(local);
      setError('');
      return;
    }

    if (!agree) {
      setError('Please accept the terms and privacy notice to continue.');
      return;
    }

    setBusy(true);
    setError('');
    setErrs({});

    try {
      if (role === 'pharmacy') {
        const response = await api<Omit<PharmacySession, 'kind'>>(
          '/auth/register',
          {
            method: 'POST',
            body: {
              pharmacyName: f.pharmacyName,
              name: f.name,
              email: f.email,
              password: f.password,
              city: f.city,
              state: f.state,
              address: f.address,
              phone: f.phone,
            },
          }
        );

        signIn({ kind: 'pharmacy', ...response });
        router.replace('/dashboard');
      } else {
        const response = await api<Omit<ConsumerSession, 'kind'>>(
          '/consumer/auth/register',
          {
            method: 'POST',
            body: {
              name: f.name,
              email: f.email,
              password: f.password,
              city: f.city,
              state: f.state,
            },
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

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join PharmaCycle and get started."
    >
      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-gray-800">
          What brings you to PharmaCycle?
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
      </div>

      {role === 'pharmacy' ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <Icon
            name="alert"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
          />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Pharmacy verification required
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              New pharmacies start with pending verification. You can set up
              your inventory, but marketplace transfers unlock after
              verification.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-3.5">
          <Icon
            name="search"
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
          />
          <div>
            <p className="text-sm font-semibold text-brand-900">
              Find medicines near you
            </p>
            <p className="mt-1 text-xs leading-5 text-brand-800">
              You can search for medicines without an account. Register to
              save your default location and make future searches easier.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5" noValidate>
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

        {role === 'pharmacy' && (
          <Field
            label="Pharmacy name"
            htmlFor="pharmacyName"
            error={errs.pharmacyName}
          >
            <input
              id="pharmacyName"
              className={cls('pharmacyName')}
              value={f.pharmacyName}
              onChange={set('pharmacyName')}
              autoComplete="organization"
              placeholder="e.g. Greenlife Pharmacy"
              disabled={busy}
            />
          </Field>
        )}

        <Field label="Your full name" htmlFor="name" error={errs.name}>
          <input
            id="name"
            className={cls('name')}
            value={f.name}
            onChange={set('name')}
            autoComplete="name"
            placeholder="Enter your full name"
            disabled={busy}
          />
        </Field>

        <Field label="Email address" htmlFor="email" error={errs.email}>
          <input
            id="email"
            type="email"
            className={cls('email')}
            value={f.email}
            onChange={set('email')}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={busy}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errs.password}
          hint="At least 8 characters, including a letter and a number."
        >
          <div className="relative">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              className={`${cls('password')} pr-12`}
              value={f.password}
              onChange={set('password')}
              autoComplete="new-password"
              placeholder="Create a password"
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

        <div className="border-t border-gray-100 pt-5">
          <p className="mb-3 text-sm font-semibold text-gray-800">
            {role === 'pharmacy' ? 'Pharmacy location' : 'Your location'}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={role === 'pharmacy' ? 'City' : 'City (optional)'}
              htmlFor="city"
              error={errs.city}
            >
              <input
                id="city"
                className={cls('city')}
                value={f.city}
                onChange={set('city')}
                autoComplete="address-level2"
                placeholder="e.g. Ikeja"
                disabled={busy}
              />
            </Field>

            <Field
              label={role === 'pharmacy' ? 'State' : 'State (optional)'}
              htmlFor="state"
              error={errs.state}
            >
              <select
                id="state"
                className={cls('state')}
                value={f.state}
                onChange={set('state')}
                disabled={busy}
              >
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {role === 'pharmacy' && (
          <div className="grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
            <Field
              label="Street address (optional)"
              htmlFor="address"
              error={errs.address}
            >
              <input
                id="address"
                className={cls('address')}
                value={f.address}
                onChange={set('address')}
                autoComplete="street-address"
                placeholder="Street and area"
                disabled={busy}
              />
            </Field>

            <Field
              label="Phone number (optional)"
              htmlFor="phone"
              error={errs.phone}
            >
              <input
                id="phone"
                type="tel"
                className={cls('phone')}
                value={f.phone}
                onChange={set('phone')}
                autoComplete="tel"
                placeholder="Your contact number"
                disabled={busy}
              />
            </Field>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked);
                if (e.target.checked) setError('');
              }}
              disabled={busy}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-brand-600"
            />

            <span className="leading-6">
              I have read and accept the{' '}
              <Link
                href="/legal"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-700 underline hover:text-brand-800"
              >
                Terms and Privacy Notice
              </Link>
              .
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
            </>
          )}
        </button>
      </form>

      <div className="mt-7 border-t border-gray-100 pt-6 text-center">
        <p className="text-sm text-gray-600">
          Already registered?{' '}
          <Link
            href="/login"
            className="font-semibold text-brand-700 transition-colors hover:text-brand-800 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
