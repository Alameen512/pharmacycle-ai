'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/Brand';
import { Badge, EmptyState, ErrorState, Field, Icon, LoadingBlock, Notice } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { formatDate, naira, NIGERIAN_STATES } from '@/lib/format';
import { useToast } from '@/contexts/ToastContext';

type Result = {
  id: string;
  medicine: { name: string; strength: string; dosageForm: string; category: string };
  price: number;
  quantity: number;
  expiryDate: string;
  pharmacy: { id: string; name: string; address: string; city: string; state: string; phone: string | null };
  distanceKm: number | null;
};
type SearchResponse = { results: Result[]; total: number; sortedByDistance: boolean };

export default function SearchPage() {
  const { session, signOut, setConsumerLocation } = useAuth();
  const toast = useToast();
  const [medicine, setMedicine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [searched, setSearched] = useState('');

  const consumer = session?.kind === 'consumer' ? session.consumer : null;
  useEffect(() => {
    if (consumer) {
      setCity((c) => c || consumer.city || '');
      setState((s) => s || consumer.state || '');
    }
  }, [consumer]);

  function locate() {
    setGeoMsg('');
    if (!('geolocation' in navigator)) return setGeoMsg('This browser cannot share your location. Search by city instead.');
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoMsg('Using your location to sort nearest first, where pharmacies have a location on file.'); },
      () => setGeoMsg('Location permission was not granted. Search by city instead.'),
      { timeout: 10000 }
    );
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (medicine.trim().length < 2) return setError('Enter at least 2 letters of the medicine name.');
    setBusy(true);
    setError('');
    try {
      const r = await api<SearchResponse>('/consumer/search', { query: { medicine: medicine.trim(), city: city.trim(), state, lat: coords?.lat, lng: coords?.lng } });
      setData(r);
      setSearched(medicine.trim());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveLocation() {
    try {
      await api('/consumer/me', { method: 'PATCH', auth: true, body: { city, state } });
      setConsumerLocation(city || null, state || null);
      toast.success('Saved as your default location.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/"><BrandMark size="sm" /></Link>
          <div className="flex items-center gap-2 text-sm">
            {consumer ? (
              <>
                <span className="hidden text-gray-600 sm:inline">{consumer.name}</span>
                <button className="btn btn-secondary btn-sm" onClick={signOut}>Log out</button>
              </>
            ) : session?.kind === 'pharmacy' ? (
              <Link href="/dashboard" className="btn btn-secondary btn-sm">Back to dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
                <Link href="/signup" className="btn btn-primary btn-sm">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Find a medicine near you</h1>
        <p className="mt-1 text-sm text-gray-600">Shows in-date stock recorded by verified pharmacies. Quantities are as last updated by the pharmacy, so confirm with them before you travel.</p>

        <form onSubmit={run} className="card mt-6 space-y-4 p-5" noValidate>
          <Field label="Medicine" htmlFor="medicine"><input id="medicine" className="input" placeholder="e.g. Paracetamol" value={medicine} onChange={(e) => setMedicine(e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City (optional)" htmlFor="city"><input id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            <Field label="State (optional)" htmlFor="state">
              <select id="state" className="input" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">Any state</option>
                {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" disabled={busy}><Icon name="search" className="h-4 w-4" />{busy ? 'Searching…' : 'Search'}</button>
            <button type="button" className="btn btn-secondary" onClick={locate}><Icon name="pin" className="h-4 w-4" />Use my location</button>
            {consumer && (city || state) && <button type="button" className="btn btn-ghost" onClick={saveLocation}>Save as my default</button>}
          </div>
          {geoMsg && <p className="text-xs text-gray-600" role="status">{geoMsg}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </form>

        <section className="mt-6" aria-live="polite">
          {busy && <LoadingBlock label="Searching pharmacies…" />}
          {!busy && data && data.results.length === 0 && (
            <div className="card"><EmptyState title={`No in-stock results for “${searched}”`} body="Try a shorter name, remove the city or state, or check the spelling. Only verified pharmacies with in-date stock are listed." /></div>
          )}
          {!busy && data && data.results.length > 0 && (
            <>
              <p className="mb-3 text-sm text-gray-600">{data.total} result{data.total === 1 ? '' : 's'} for “{searched}”{data.total > data.results.length ? ` (showing the first ${data.results.length})` : ''}{data.sortedByDistance ? ', nearest first' : ''}.</p>
              <ul className="space-y-3">
                {data.results.map((r) => (
                  <li key={r.id} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{r.medicine.name} <span className="font-normal text-gray-500">{r.medicine.strength} · {r.medicine.dosageForm}</span></p>
                        <p className="mt-0.5 text-sm text-gray-700">{r.pharmacy.name}</p>
                        <p className="text-xs text-gray-500">{[r.pharmacy.address, r.pharmacy.city, r.pharmacy.state].filter(Boolean).join(', ')}{r.distanceKm !== null ? ` · ${r.distanceKm} km away` : ''}</p>
                        {r.pharmacy.phone && <p className="mt-1 text-xs text-gray-500">Phone: {r.pharmacy.phone}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{naira(r.price)}</p>
                        <p className="text-xs text-gray-500">{r.quantity} in stock</p>
                        <p className="text-xs text-gray-400">Expires {formatDate(r.expiryDate)}</p>
                      </div>
                    </div>
                    <div className="mt-2"><Badge tone="gray">{r.medicine.category}</Badge></div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!busy && !data && !error && <Notice>Search is free and does not need an account. Reservations and ordering are not available yet: contact the pharmacy directly.</Notice>}
          {!busy && error && !data && <div className="card"><ErrorState message={error} /></div>}
        </section>
      </main>
    </div>
  );
}
