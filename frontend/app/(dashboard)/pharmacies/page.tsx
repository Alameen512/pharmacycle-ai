
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Badge,
  EmptyState,
  ErrorState,
  Icon,
  LoadingBlock,
  Pagination,
} from '@/components/ui';
import { NIGERIAN_STATES } from '@/lib/format';
import type { Pagination as Pg } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type P = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  distanceKm: number | null;
};

export default function PharmaciesPage() {
  const [search, setSearch] = useState('');
  const [dsearch, setDsearch] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDsearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, loading, reload } = useApi<{
    pharmacies: P[];
    pagination: Pg;
    sortedByDistance: boolean;
  }>('/pharmacies', {
    search: dsearch,
    state,
    page,
    pageSize: 12,
    lat: coords?.lat,
    lng: coords?.lng,
  });

  function locate() {
    if (!('geolocation' in navigator)) {
      setGeoMsg('Your browser does not support location sharing.');
      return;
    }

    setLocating(true);
    setGeoMsg('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setPage(1);
        setLocating(false);
        setGeoMsg('');
      },
      (error) => {
        setLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          setGeoMsg('Location permission was denied. You can enable it in your browser settings.');
        } else if (error.code === error.TIMEOUT) {
          setGeoMsg('Location request timed out. Please try again.');
        } else {
          setGeoMsg('Unable to determine your location. Please try again.');
        }
      },
      { timeout: 10000 }
    );
  }

  function clearFilters() {
    setSearch('');
    setDsearch('');
    setState('');
    setCoords(null);
    setPage(1);
    setGeoMsg('');
  }

  const hasFilters = Boolean(search || state || coords);

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <section className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <span className="mb-2 inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            Pharmacy network
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">
            Partner pharmacies
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Discover verified pharmacies, explore nearby partners and find
            pharmacies across Nigeria.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700">
            <Icon name="users" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Verified network
            </p>
            <p className="text-xs text-gray-500">
              Trusted pharmacy directory
            </p>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="font-semibold text-gray-900">
            Find a pharmacy
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Search by pharmacy name or location.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              aria-label="Search pharmacies"
              className="input w-full pl-9"
              placeholder="Pharmacy name, city or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            aria-label="Filter by state"
            className="input w-full lg:w-52"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All states</option>
            {NIGERIAN_STATES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            className="btn btn-secondary shrink-0"
            onClick={
              coords
                ? () => {
                    setCoords(null);
                    setPage(1);
                    setGeoMsg('');
                  }
                : locate
            }
            disabled={locating}
          >
            <Icon name="pin" className="h-4 w-4" />
            {locating
              ? 'Finding location…'
              : coords
                ? 'Clear location'
                : 'Nearest first'}
          </button>
        </div>

        {geoMsg && (
          <p role="status" className="text-sm text-amber-700">
            {geoMsg}
          </p>
        )}

        {coords && (
          <p className="flex items-center gap-2 text-xs font-medium text-green-700">
            <Icon name="checkCircle" className="h-4 w-4" />
            Showing pharmacies based on your location.
          </p>
        )}

        {hasFilters && (
          <div className="flex justify-end">
            <button
              className="text-xs font-semibold text-gray-500 transition hover:text-gray-900"
              onClick={clearFilters}
            >
              Clear all filters
            </button>
          </div>
        )}
      </section>

      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-gray-900">
              Pharmacy directory
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {data
                ? `${data.pagination.total} verified pharmacies found`
                : 'Browse verified pharmacies in the network'}
            </p>
          </div>

          {data?.sortedByDistance && (
            <Badge tone="green">Sorted by distance</Badge>
          )}
        </div>

        {loading && !data ? (
          <div className="card">
            <LoadingBlock />
          </div>
        ) : error ? (
          <div className="card">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : !data?.pharmacies.length ? (
          <div className="card">
            <EmptyState
              title="No pharmacies found"
              body={
                hasFilters
                  ? 'No verified pharmacies match your current search. Try changing your search or clearing the filters.'
                  : 'There are currently no verified pharmacies available in the directory.'
              }
              action={
                hasFilters ? (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.pharmacies.map((pharmacy) => (
                <Link
                  key={pharmacy.id}
                  href={`/pharmacies/${pharmacy.id}`}
                  className="card group flex min-w-0 flex-col p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:p-5"
                  aria-label={`View ${pharmacy.name} pharmacy profile`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                      <Icon name="pharmacy" className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold leading-snug text-gray-900 group-hover:text-green-700">
                        {pharmacy.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {pharmacy.city}, {pharmacy.state}
                      </p>
                    </div>

                    <Badge tone="green">Verified</Badge>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <Icon
                        name="pin"
                        className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                      />
                      <span className="break-words">
                        {pharmacy.address}
                        {pharmacy.city ? `, ${pharmacy.city}` : ''}
                        {pharmacy.state ? `, ${pharmacy.state}` : ''}
                      </span>
                    </div>

                    {pharmacy.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Icon
                          name="person"
                          className="h-4 w-4 shrink-0 text-gray-400"
                        />
                        <span>{pharmacy.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                    <span className="text-xs font-medium text-green-700">
                      View pharmacy and available stock
                    </span>

                    <span className="flex items-center gap-2">
                      {pharmacy.distanceKm !== null && (
                        <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {pharmacy.distanceKm} km away
                        </span>
                      )}
                      <Icon
                        name="chevronRight"
                        className="h-4 w-4 text-gray-400 transition group-hover:translate-x-1 group-hover:text-green-700"
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="rounded-xl border border-gray-100 bg-white px-4">
              <Pagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                total={data.pagination.total}
                onPage={setPage}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
