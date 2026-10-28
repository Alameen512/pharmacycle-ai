
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

type Pharmacy = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  users: { id: string; name: string; email: string }[];
};

type Stats = {
  pending: number;
  verified: number;
  rejected: number;
  total: number;
};

const TOKEN_KEY = 'pharmacycle.platformAdminToken';

export default function PlatformAdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    verified: 0,
    rejected: 0,
    total: 0,
  });
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const savedToken = sessionStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      router.replace('/admin/login');
      return;
    }
    setToken(savedToken);
  }, [router]);

  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      router.replace('/admin/login');
      throw new Error('Your admin session expired. Please sign in again.');
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || 'The request failed.');
    }

    return data;
  }, [token, router]);

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const [newStats, result] = await Promise.all([
        request('/platform-admin/stats'),
        request(`/platform-admin/pharmacies?status=${filter}`),
      ]);

      setStats(newStats);
      setPharmacies(result.pharmacies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the dashboard.');
    } finally {
      setLoading(false);
    }
  }, [token, filter, request]);

  useEffect(() => {
    if (token) loadDashboard();
  }, [token, loadDashboard]);

  async function updateVerification(id: string, status: 'VERIFIED' | 'REJECTED') {
    const pharmacy = pharmacies.find((p) => p.id === id);
    if (!pharmacy) return;

    const action = status === 'VERIFIED' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${action} ${pharmacy.name}?`)) return;

    setWorkingId(id);
    setError('');
    setNotice('');

    try {
      const result = await request(`/platform-admin/pharmacies/${id}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setNotice(result.message || `Pharmacy ${action}d successfully.`);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update pharmacy status.');
    } finally {
      setWorkingId('');
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    router.replace('/admin/login');
  }

  const cards = [
    { label: 'Total pharmacies', value: stats.total, color: 'text-slate-900' },
    { label: 'Pending review', value: stats.pending, color: 'text-amber-700' },
    { label: 'Verified', value: stats.verified, color: 'text-emerald-700' },
    { label: 'Rejected', value: stats.rejected, color: 'text-rose-700' },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              PharmaCycle.AI
            </p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">Platform Admin</h1>
            <p className="mt-1 text-sm text-slate-500">Pharmacy verification management</p>
          </div>
          <button
            onClick={logout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Verification overview</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review pharmacy registrations and manage access to the platform.
            </p>
          </div>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        <section aria-label="Pharmacy statistics" className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className={`mt-3 text-3xl font-bold ${card.color}`}>
                {loading ? '—' : card.value}
              </p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <h2 className="text-lg font-bold">Pharmacy applications</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a status to review the corresponding pharmacy records.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {(['PENDING', 'VERIFIED', 'REJECTED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  aria-pressed={filter === status}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    filter === status
                      ? 'bg-blue-700 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {status === 'PENDING' ? 'Pending' : status === 'VERIFIED' ? 'Verified' : 'Rejected'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading pharmacy records…</div>
          ) : pharmacies.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold">No {filter.toLowerCase()} pharmacies found</p>
              <p className="mt-2 text-sm text-slate-500">Pharmacies in this category will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pharmacies.map((pharmacy) => (
                <article key={pharmacy.id} className="p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold">{pharmacy.name}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          pharmacy.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : pharmacy.verificationStatus === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                        }`}>
                          {pharmacy.verificationStatus}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        {[pharmacy.city, pharmacy.state].filter(Boolean).join(', ')}
                      </p>
                      {pharmacy.address && (
                        <p className="mt-1 text-sm text-slate-500">{pharmacy.address}</p>
                      )}
                      {pharmacy.phone && (
                        <p className="mt-1 text-sm text-slate-500">Phone: {pharmacy.phone}</p>
                      )}
                      <p className="mt-3 text-xs text-slate-400">
                        Registered {new Date(pharmacy.createdAt).toLocaleDateString()}
                      </p>

                      <div className="mt-3 space-y-1">
                        {pharmacy.users.map((user) => (
                          <p key={user.id} className="text-sm text-slate-600">
                            {user.name} · {user.email}
                          </p>
                        ))}
                      </div>
                    </div>

                    {filter === 'PENDING' && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => updateVerification(pharmacy.id, 'VERIFIED')}
                          disabled={workingId === pharmacy.id}
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {workingId === pharmacy.id ? 'Saving…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => updateVerification(pharmacy.id, 'REJECTED')}
                          disabled={workingId === pharmacy.id}
                          className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
