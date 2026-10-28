
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/platform-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Admin login failed.');
      }

      sessionStorage.setItem('pharmacycle.platformAdminToken', data.token);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
          PharmaCycle.AI
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          Platform Admin
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to review and verify pharmacy registrations.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-5">
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Admin email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter your admin password"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in securely'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Restricted access for authorized platform administrators.
        </p>
      </div>
    </main>
  );
}
