
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
            'Location found. Enter a medicine and tap Search to find nearby pharmacies.'
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/">
            <BrandMark size="sm" />
          </Link>

          <div className="flex items-center gap-2 text-sm">
            {consumer ? (
              <>
                <span className="hidden text-gray-600 sm:inline">
                  {consumer.name}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={signOut}
                >
                  Log out
                </button>
              </>
            ) : session?.kind === 'pharmacy' ? (
              <Link
                href="/dashboard"
                className="btn btn-secondary btn-sm"
              >
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

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Find a medicine near you
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Browse in-date stock recorded by verified pharmacies. Stock
          information may change, so the pharmacy must confirm availability
          before an order is accepted.
        </p>

        <form
          onSubmit={run}
          className="card mt-6 space-y-4 p-5"
          noValidate
        >
          <Field label="Medicine" htmlFor="medicine">
            <input
              id="medicine"
              className="input"
              placeholder="e.g. Paracetamol"
              value={medicine}
              onChange={(e) => setMedicine(e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City (optional)" htmlFor="city">
              <input
                id="city"
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>

            <Field label="State (optional)" htmlFor="state">
              <select
                id="state"
                className="input"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">Any state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" disabled={busy}>
              <Icon name="search" className="h-4 w-4" />
              {busy ? 'Searching…' : 'Search'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={locate}
              disabled={locationBusy}
            >
              <Icon name="pin" className="h-4 w-4" />
              {locationBusy ? 'Finding location…' : 'Use my location'}
            </button>

            {consumer && (city || state) && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={saveLocation}
              >
                Save as my default
              </button>
            )}
          </div>

          {geoMsg && (
            <p className="text-xs text-gray-600" role="status">
              {geoMsg}
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
        </form>

        <section className="mt-6" aria-live="polite">
          {deliverySuccess && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {deliverySuccess}
            </div>
          )}

          {busy && <LoadingBlock label="Searching pharmacies…" />}

          {!busy && data && data.results.length === 0 && (
            <div className="card">
              <EmptyState
                title={`No in-stock results for “${searched}”`}
                body="Try a shorter name, remove the city or state, or check the spelling. Only verified pharmacies with in-date stock are listed."
              />
            </div>
          )}

          {!busy && data && data.results.length > 0 && (
            <>
              <p className="mb-3 text-sm text-gray-600">
                {data.total} result{data.total === 1 ? '' : 's'} for “
                {searched}”
                {data.total > data.results.length
                  ? ` (showing the first ${data.results.length})`
                  : ''}
                {data.sortedByDistance ? ', nearest first' : ''}.
              </p>

              <ul className="space-y-3">
                {data.results.map((r) => (
                  <li key={r.id} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {r.medicine.name}{' '}
                          <span className="font-normal text-gray-500">
                            {r.medicine.strength} · {r.medicine.dosageForm}
                          </span>
                        </p>

                        <p className="mt-0.5 text-sm text-gray-700">
                          {r.pharmacy.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {[
                            r.pharmacy.address,
                            r.pharmacy.city,
                            r.pharmacy.state,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                          {r.distanceKm !== null
                            ? ` · ${r.distanceKm} km away`
                            : ''}
                        </p>

                        {r.pharmacy.phone && (
                          <p className="mt-1 text-xs text-gray-500">
                            Phone: {r.pharmacy.phone}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {naira(r.price)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {r.quantity} in stock
                        </p>
                        <p className="text-xs text-gray-400">
                          Expires {formatDate(r.expiryDate)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2">
                      <Badge tone="gray">{r.medicine.category}</Badge>
                    </div>

                    <div className="mt-4">
                      {deliveryFor === r.id ? (
                        <form
                          onSubmit={(e) => submitDelivery(e, r)}
                          className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
                          noValidate
                        >
                          <h2 className="font-semibold text-gray-900">
                            Request delivery
                          </h2>

                          <p className="text-sm text-gray-600">
                            Send your details to the pharmacy. This is a
                            request, not a confirmed order.
                          </p>

                          <Field label="Full name" htmlFor={`name-${r.id}`}>
                            <input
                              id={`name-${r.id}`}
                              className="input"
                              value={customerName}
                              onChange={(e) =>
                                setCustomerName(e.target.value)
                              }
                              minLength={2}
                              maxLength={100}
                              required
                            />
                          </Field>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                              label="Phone number"
                              htmlFor={`phone-${r.id}`}
                            >
                              <input
                                id={`phone-${r.id}`}
                                className="input"
                                type="tel"
                                autoComplete="tel"
                                value={customerPhone}
                                onChange={(e) =>
                                  setCustomerPhone(e.target.value)
                                }
                                minLength={7}
                                maxLength={30}
                                required
                              />
                            </Field>

                            <Field
                              label="Email (optional)"
                              htmlFor={`email-${r.id}`}
                            >
                              <input
                                id={`email-${r.id}`}
                                className="input"
                                type="email"
                                autoComplete="email"
                                value={customerEmail}
                                onChange={(e) =>
                                  setCustomerEmail(e.target.value)
                                }
                                maxLength={190}
                              />
                            </Field>
                          </div>

                          <Field
                            label="Delivery address"
                            htmlFor={`address-${r.id}`}
                          >
                            <textarea
                              id={`address-${r.id}`}
                              className="input min-h-20"
                              autoComplete="street-address"
                              value={deliveryAddress}
                              onChange={(e) =>
                                setDeliveryAddress(e.target.value)
                              }
                              minLength={5}
                              maxLength={500}
                              required
                            />
                          </Field>

                          <Field
                            label={`Quantity (up to ${r.quantity})`}
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
                              onChange={(e) =>
                                setDeliveryQuantity(e.target.value)
                              }
                              required
                            />
                          </Field>

                          <p className="text-sm text-gray-600">
                            Listed medicine cost:{' '}
                            {naira(
                              r.price *
                                Math.max(0, Number(deliveryQuantity) || 0)
                            )}
                            . Delivery fees, availability and payment must
                            be confirmed by the pharmacy.
                          </p>

                          {deliveryError && (
                            <p
                              className="text-sm text-red-700"
                              role="alert"
                            >
                              {deliveryError}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={deliveryBusy}
                            >
                              {deliveryBusy
                                ? 'Submitting…'
                                : 'Submit delivery request'}
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary"
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
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => openDeliveryForm(r)}
                        >
                          Request delivery
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!busy && !data && !error && (
            <Notice>
              Searching is free and does not require an account. You can
              submit a delivery request from a medicine listing. The
              pharmacy must confirm availability, delivery fees and payment
              before any order is confirmed.
            </Notice>
          )}

          {!busy && error && !data && (
            <div className="card">
              <ErrorState message={error} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
