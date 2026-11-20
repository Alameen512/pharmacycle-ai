
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/Brand';
import {
  Badge,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  LoadingBlock,
  Notice,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { formatDate, naira, NIGERIAN_STATES } from '@/lib/format';
import { useToast } from '@/contexts/ToastContext';

type Result = {
  id: string;
  medicine: {
    name: string;
    strength: string;
    dosageForm: string;
    category: string;
  };
  price: number;
  quantity: number;
  expiryDate: string;
  pharmacy: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    phone: string | null;
  };
  distanceKm: number | null;
};

type SearchResponse = {
  results: Result[];
  total: number;
  sortedByDistance: boolean;
};

type Coordinates = { lat: number; lng: number };

export default function SearchPage() {
  const { session, signOut, setConsumerLocation } = useAuth();
  const toast = useToast();

  const [medicine, setMedicine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [geoMsg, setGeoMsg] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [searched, setSearched] = useState('');

  const [deliveryFor, setDeliveryFor] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryQuantity, setDeliveryQuantity] = useState('1');
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [deliverySuccess, setDeliverySuccess] = useState('');

  const consumer = session?.kind === 'consumer' ? session.consumer : null;

  useEffect(() => {
    if (consumer) {
      setCity((current) => current || consumer.city || '');
      setState((current) => current || consumer.state || '');
      setCustomerName((current) => current || consumer.name || '');
      setCustomerEmail((current) => current || consumer.email || '');
    }
  }, [consumer]);

  async function searchMedicine(
    searchTerm: string,
    locationCoords: Coordinates | null = coords
  ) {
    if (searchTerm.trim().length < 2) {
      setError('Enter at least 2 letters of the medicine name.');
      return;
    }

    setBusy(true);
    setError('');
    setData(null);
    setDeliveryFor(null);

    try {
      const response = await api<SearchResponse>('/consumer/search', {
        query: {
          medicine: searchTerm.trim(),
          city: city.trim(),
          state,
          lat: locationCoords?.lat,
          lng: locationCoords?.lng,
        },
      });

      setData(response);
      setSearched(searchTerm.trim());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function run(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await searchMedicine(medicine);
  }

  function locate() {
    setGeoMsg('');
    setLocationBusy(true);

    if (!('geolocation' in navigator)) {
      setGeoMsg(
        'Your browser does not support location sharing. You can search by city instead.'
      );
      setLocationBusy(false);
      return;
    }

    if (!window.isSecureContext) {
      setGeoMsg(
        'Location requires a secure connection. Open the website using HTTPS or localhost.'
      );
      setLocationBusy(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCoords(locationCoords);
        setGeoMsg(
          'Location found. Pharmacies with saved coordinates will be sorted by distance.'
        );
        setLocationBusy(false);

        if (medicine.trim().length >= 2) {
          void searchMedicine(medicine, locationCoords);
        } else {
          setGeoMsg(
            'Location found. Enter a medicine and search to find nearby pharmacies.'
          );
        }
      },
      (geoError) => {
        if (geoError.code === 1) {
          setGeoMsg(
            'Location permission was denied. Allow location access for this website in your browser settings, then try again.'
          );
        } else if (geoError.code === 2) {
          setGeoMsg(
            'Your location could not be determined. Check your device location settings and try again.'
          );
        } else if (geoError.code === 3) {
          setGeoMsg(
            'Location lookup timed out. Check your connection and try again.'
          );
        } else {
          setGeoMsg(
            'Unable to get your location. You can search by city instead.'
          );
        }

        setLocationBusy(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }

  async function saveLocation() {
    try {
      await api('/consumer/me', {
        method: 'PATCH',
        auth: true,
        body: { city, state },
      });

      setConsumerLocation(city || null, state || null);
      toast.success('Saved as your default location.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function openDeliveryForm(result: Result) {
    setDeliveryFor(result.id);
    setDeliveryQuantity('1');
    setCustomerName((current) => current || consumer?.name || '');
    setCustomerEmail((current) => current || consumer?.email || '');
    setCustomerPhone('');
    setDeliveryAddress('');
    setDeliveryError('');
    setDeliverySuccess('');
  }

  async function submitDelivery(
    e: React.FormEvent<HTMLFormElement>,
    result: Result
  ) {
    e.preventDefault();
    setDeliveryError('');
    setDeliverySuccess('');

    const quantity = Number(deliveryQuantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      setDeliveryError('Enter a valid quantity of at least 1.');
      return;
    }

    if (quantity > result.quantity) {
      setDeliveryError(
        `Only ${result.quantity} units are currently listed as available.`
      );
      return;
    }

    setDeliveryBusy(true);

    try {
      const response = await api<{ message: string }>(
        '/consumer/delivery-requests',
        {
          method: 'POST',
          body: {
            inventoryItemId: result.id,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerEmail: customerEmail.trim(),
            deliveryAddress: deliveryAddress.trim(),
            quantity,
          },
        }
      );

      setDeliverySuccess(response.message);
      setDeliveryFor(null);
      toast.success('Delivery request submitted successfully.');
    } catch (err) {
      setDeliveryError(errorMessage(err));
    } finally {
      setDeliveryBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6faf7] text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="PharmaCycle.AI home">
            <BrandMark size="sm" />
          </Link>

          <div className="flex items-center gap-2">
            {consumer ? (
              <>
                <span className="hidden max-w-[150px] truncate text-sm font-medium text-gray-600 sm:inline">
                  {consumer.name}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={signOut}
                >
                  Log out
                </button>
              </>
            ) : session?.kind === 'pharmacy' ? (
              <Link href="/dashboard" className="btn btn-secondary btn-sm">
                Back to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#176b50] to-[#0d4f3c] px-5 py-8 text-white shadow-[0_25px_70px_rgba(13,79,60,0.14)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-28 right-28 h-64 w-64 rounded-full bg-white/5" />

          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-green-50">
              <Icon name="search" className="h-3.5 w-3.5" />
              Medicine finder
            </span>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Find the medicine you need.
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-green-50/85 sm:text-base">
              Search available stock from participating verified pharmacies.
              Compare listed prices and locations, then contact a pharmacy
              about availability.
            </p>
          </div>
        </section>

        <section className="relative z-10 -mt-5 px-2 sm:px-5">
          <form
            onSubmit={run}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_15px_45px_rgba(15,23,42,0.07)] sm:p-6"
            noValidate
          >
            <div className="mb-4">
              <label
                htmlFor="medicine"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                What medicine are you looking for?
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="medicine"
                    className="input h-12 w-full pl-11"
                    placeholder="e.g. Paracetamol, Amoxicillin..."
                    value={medicine}
                    onChange={(e) => setMedicine(e.target.value)}
                    minLength={2}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary h-12 justify-center px-7"
                  disabled={busy}
                >
                  <Icon name="search" className="h-4 w-4" />
                  {busy ? 'Searching…' : 'Search medicines'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" htmlFor="city">
                <input
                  id="city"
                  className="input"
                  placeholder="Enter your city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Field>

              <Field label="State" htmlFor="state">
                <select
                  id="state"
                  className="input"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">Any state</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 transition-colors hover:text-green-800 disabled:opacity-50"
                  onClick={locate}
                  disabled={locationBusy}
                >
                  <Icon name="pin" className="h-4 w-4" />
                  {locationBusy ? 'Finding your location…' : 'Use my current location'}
                </button>

                {geoMsg && (
                  <p className="mt-2 max-w-xl text-xs leading-relaxed text-gray-500" role="status">
                    {geoMsg}
                  </p>
                )}
              </div>

              {consumer && (city || state) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={saveLocation}
                >
                  Save default location
                </button>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </form>
        </section>

        <section className="mt-9" aria-live="polite">
          {deliverySuccess && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Request submitted</p>
                <p className="mt-1 leading-relaxed">{deliverySuccess}</p>
              </div>
            </div>
          )}

          {busy && <LoadingBlock label="Searching available pharmacies…" />}

          {!busy && data && data.results.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <EmptyState
                title={`No in-stock results for “${searched}”`}
                body="Try a shorter medicine name, remove your location filters, or check the spelling. Only verified pharmacies with in-date stock are listed."
              />
            </div>
          )}

          {!busy && data && data.results.length > 0 && (
            <>
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
                    Search results
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">
                    Available medicines
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {data.total} result{data.total === 1 ? '' : 's'} for “{searched}”
                    {data.total > data.results.length
                      ? ` · Showing ${data.results.length}`
                      : ''}
                  </p>
                </div>

                {data.sortedByDistance && (
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    <Icon name="pin" className="h-3.5 w-3.5" />
                    Nearest pharmacies first
                  </span>
                )}
              </div>

              <ul className="space-y-4">
                {data.results.map((r) => (
                  <li
                    key={r.id}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="gray">{r.medicine.category}</Badge>
                          </div>

                          <h3 className="mt-3 text-lg font-bold text-gray-900">
                            {r.medicine.name}
                          </h3>

                          <p className="mt-0.5 text-sm text-gray-500">
                            {r.medicine.strength} · {r.medicine.dosageForm}
                          </p>

                          <div className="mt-4 flex items-start gap-2">
                            <Icon name="pharmacy" className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800">
                                {r.pharmacy.name}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                                {[
                                  r.pharmacy.address,
                                  r.pharmacy.city,
                                  r.pharmacy.state,
                                ]
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>

                              {r.pharmacy.phone && (
                                <a
                                  href={`tel:${r.pharmacy.phone}`}
                                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800"
                                >
                                  <Icon name="phone" className="h-3.5 w-3.5" />
                                  {r.pharmacy.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4 sm:min-w-[170px] sm:flex-col sm:items-end sm:bg-transparent sm:p-0">
                          <div className="sm:text-right">
                            <p className="text-xs text-gray-500">Listed price</p>
                            <p className="mt-1 text-xl font-extrabold text-gray-900">
                              {naira(r.price)}
                            </p>
                          </div>

                          <div className="text-right sm:text-right">
                            <p className="text-sm font-semibold text-gray-700">
                              {r.quantity} units
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Available stock
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="clock" className="h-3.5 w-3.5" />
                            Expires {formatDate(r.expiryDate)}
                          </span>

                          {r.distanceKm !== null && (
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="pin" className="h-3.5 w-3.5" />
                              {r.distanceKm} km away
                            </span>
                          )}
                        </div>

                        {deliveryFor !== r.id && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openDeliveryForm(r)}
                          >
                            Request delivery
                            <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
                          </button>
                        )}
                      </div>

                      {deliveryFor === r.id && (
                        <form
                          onSubmit={(e) => submitDelivery(e, r)}
                          className="mt-5 space-y-4 rounded-2xl border border-green-100 bg-green-50/40 p-4 sm:p-5"
                        >
                          <div>
                            <h4 className="font-bold text-gray-900">
                              Request delivery
                            </h4>
                            <p className="mt-1 text-xs leading-relaxed text-gray-500">
                              Enter your details so the pharmacy can follow up.
                              This request does not confirm an order.
                            </p>
                          </div>

                          <Field label="Full name" htmlFor={`name-${r.id}`}>
                            <input
                              id={`name-${r.id}`}
                              className="input"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              minLength={2}
                              maxLength={100}
                              required
                            />
                          </Field>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Phone number" htmlFor={`phone-${r.id}`}>
                              <input
                                id={`phone-${r.id}`}
                                className="input"
                                type="tel"
                                autoComplete="tel"
                                placeholder="Your phone number"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                minLength={7}
                                maxLength={30}
                                required
                              />
                            </Field>

                            <Field label="Email (optional)" htmlFor={`email-${r.id}`}>
                              <input
                                id={`email-${r.id}`}
                                className="input"
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                maxLength={190}
                              />
                            </Field>
                          </div>

                          <Field label="Delivery address" htmlFor={`address-${r.id}`}>
                            <textarea
                              id={`address-${r.id}`}
                              className="input min-h-20"
                              autoComplete="street-address"
                              placeholder="Enter the full delivery address"
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              minLength={5}
                              maxLength={500}
                              required
                            />
                          </Field>

                          <Field
                            label={`Quantity (maximum ${r.quantity})`}
                            htmlFor={`quantity-${r.id}`}
                          >
                            <input
                              id={`quantity-${r.id}`}
                              className="input"
                              type="number"
                              min={1}
                              max={r.quantity}
                              step={1}
                              value={deliveryQuantity}
                              onChange={(e) => setDeliveryQuantity(e.target.value)}
                              required
                            />
                          </Field>

                          <div className="rounded-xl border border-green-100 bg-white p-4">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-gray-500">Listed price per unit</span>
                              <span className="font-semibold text-gray-800">{naira(r.price)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                              <span className="text-gray-500">Quantity</span>
                              <span className="font-semibold text-gray-800">
                                {Math.max(0, Number(deliveryQuantity) || 0)}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                              <span className="font-semibold text-gray-800">Estimated medicine cost</span>
                              <span className="text-lg font-extrabold text-green-700">
                                {naira(
                                  r.price * Math.max(0, Number(deliveryQuantity) || 0)
                                )}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-gray-400">
                              Delivery fees, final availability and payment are
                              confirmed directly by the pharmacy.
                            </p>
                          </div>

                          {deliveryError && (
                            <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700" role="alert">
                              {deliveryError}
                            </p>
                          )}

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="submit"
                              className="btn btn-primary justify-center"
                              disabled={deliveryBusy}
                            >
                              {deliveryBusy ? 'Submitting request…' : 'Submit request'}
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary justify-center"
                              disabled={deliveryBusy}
                              onClick={() => {
                                setDeliveryFor(null);
                                setDeliveryError('');
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!busy && !data && !error && (
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <Icon name="leaf" className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    A simpler way to find available medicines
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    Enter a medicine name to get started. Searching is free
                    and does not require an account. You can submit a delivery
                    request from a listing, but the pharmacy must confirm
                    availability and arrangements before an order is accepted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!busy && error && !data && (
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
              <ErrorState message={error} />
            </div>
          )}
        </section>

        <div className="mt-10 border-t border-gray-200 pt-5 text-center">
          <p className="text-xs leading-relaxed text-gray-400">
            Medicine listings are provided by participating pharmacies.
            Always confirm availability, product details and payment directly
            with the pharmacy before purchase.
          </p>
          <Link
            href="/"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800"
          >
            <Icon name="chevronDown" className="h-3 w-3 rotate-90" />
            Back to PharmaCycle.AI
          </Link>
        </div>
      </main>
    </div>
  );
}
