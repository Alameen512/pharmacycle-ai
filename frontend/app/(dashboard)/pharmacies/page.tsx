'use client';
import { useEffect, useState } from 'react';
import { Badge, EmptyState, ErrorState, Icon, LoadingBlock, Pagination } from '@/components/ui';
import { NIGERIAN_STATES } from '@/lib/format';
import type { Pagination as Pg } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type P = { id: string; name: string; address: string; city: string; state: string; phone: string | null; distanceKm: number | null };

export default function PharmaciesPage() {
  const [search, setSearch] = useState('');
  const [dsearch, setDsearch] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDsearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading, reload } = useApi<{ pharmacies: P[]; pagination: Pg; sortedByDistance: boolean }>('/pharmacies', { search: dsearch, state, page, pageSize: 12, lat: coords?.lat, lng: coords?.lng });

  function locate() {
    if (!('geolocation' in navigator)) return setGeoMsg('This browser cannot share your location.');
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setPage(1); setGeoMsg(''); },
      () => setGeoMsg('Location permission was not granted.'),
      { timeout: 10000 }
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input aria-label="Search pharmacies" className="input pl-9" placeholder="Search by name, city or address" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select aria-label="Filter by state" className="input sm:w-48" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
          <option value="">All states</option>
          {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={coords ? () => setCoords(null) : locate}><Icon name="pin" className="h-4 w-4" />{coords ? 'Clear location sort' : 'Nearest first'}</button>
      </div>
      {geoMsg && <p role="status" className="text-sm text-gray-600">{geoMsg}</p>}

      {loading && !data ? <LoadingBlock /> : error ? <div className="card"><ErrorState message={error} onRetry={reload} /></div> : !data?.pharmacies.length ? (
        <div className="card"><EmptyState title="No verified pharmacies found" body="Only pharmacies that have been verified are listed. Try a different search or state." /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.pharmacies.map((p) => (
              <article key={p.id} className="card p-5">
                <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-gray-900">{p.name}</h3><Badge tone="green">Verified</Badge></div>
                <p className="mt-2 flex items-start gap-1.5 text-sm text-gray-600"><Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><span>{[p.address, p.city, p.state].filter(Boolean).join(', ')}</span></p>
                {p.phone && <p className="mt-1 text-sm text-gray-600">{p.phone}</p>}
                {p.distanceKm !== null && <p className="mt-2 text-xs text-gray-500">{p.distanceKm} km away</p>}
              </article>
            ))}
          </div>
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
