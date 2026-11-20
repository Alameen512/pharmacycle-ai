
'use client';

import { useEffect, useState } from 'react';
import { RequestModal } from '@/components/RequestModal';
import { ListingBadge } from '@/components/StatusBadge';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  LoadingBlock,
  Modal,
  Notice,
  Pagination,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, errorMessage, fieldErrors } from '@/lib/api';
import { expiryNote, formatDate, naira } from '@/lib/format';
import type { InventoryItem, Listing, Pagination as Pg } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Tab = 'available' | 'mine';

export default function TransfersPage() {
  const { session } = useAuth();
  const toast = useToast();

  const verified =
    session?.kind === 'pharmacy' &&
    session.pharmacy.verificationStatus === 'VERIFIED';

  const [tab, setTab] = useState<Tab>('available');
  const [search, setSearch] = useState('');
  const [dsearch, setDsearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Listing | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [cancelling, setCancelling] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('tab') === 'mine') setTab('mine');

    if (params.get('new')) {
      setTab('mine');
      setCreating(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDsearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const available = useApi<{
    listings: Listing[];
    pagination: Pg;
  }>(
    tab === 'available' ? '/transfers/available' : null,
    { search: dsearch, page, pageSize: 12 }
  );

  const mine = useApi<{ listings: Listing[] }>(
    tab === 'mine' ? '/transfers/mine' : null
  );

  async function cancelListing() {
    if (!cancelling) return;

    setBusy(true);

    try {
      const result = await api<{ cancelledRequests: number }>(
        `/transfers/${cancelling.id}/cancel`,
        {
          method: 'POST',
          auth: true,
          body: {},
        }
      );

      toast.success(
        result.cancelledRequests
          ? `Listing cancelled. ${result.cancelledRequests} pending request(s) were cancelled.`
          : 'Listing cancelled.'
      );

      setCancelling(null);
      mine.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const availableCount = available.data?.pagination.total ?? 0;
  const myListings = mine.data?.listings ?? [];
  const activeListings = myListings.filter(
    (listing) =>
      listing.status === 'AVAILABLE' || listing.status === 'PENDING'
  ).length;
  const pendingRequests = myListings.reduce(
    (total, listing) => total + (listing.pendingRequests ?? 0),
    0
  );

  return (
    <div className="space-y-6 pb-8">

      {/* Marketplace introduction */}
      <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-emerald-50" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-blue-50" />

        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Icon name="repeat" className="h-3.5 w-3.5" />
              Pharmacy marketplace
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
              Find stock. Move stock.
            </h1>

            <p className="mt-2 max-w-lg text-sm leading-6 text-gray-600">
              Discover available medicines from partner pharmacies or offer
              your surplus stock to pharmacies that need it.
            </p>
          </div>

          <button
            onClick={() => {
              setTab('mine');
              setCreating(true);
            }}
            disabled={!verified}
            className="btn btn-primary shrink-0"
          >
            <Icon name="plus" className="h-4 w-4" />
            List your stock
          </button>
        </div>
      </section>

      {!verified && (
        <Notice tone="orange">
          Your pharmacy must be verified before you can request or list stock.
          You can still browse available marketplace listings.
        </Notice>
      )}

      {/* Marketplace overview */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Icon name="package" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                Available listings
              </p>
              <p className="text-xl font-bold text-gray-950">
                {tab === 'available' && available.data
                  ? availableCount
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Icon name="repeat" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                Your active listings
              </p>
              <p className="text-xl font-bold text-gray-950">
                {tab === 'mine' && mine.data ? activeListings : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Icon name="inbox" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                Pending requests
              </p>
              <p className="text-xl font-bold text-gray-950">
                {tab === 'mine' && mine.data ? pendingRequests : '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace tabs */}
      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 sm:flex-row sm:items-center">
          <div className="flex gap-6">
            <button
              onClick={() => setTab('available')}
              className={`relative pb-3 text-sm font-semibold transition ${
                tab === 'available'
                  ? 'text-emerald-700'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Browse medicines
              {tab === 'available' && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-emerald-600" />
              )}
            </button>

            <button
              onClick={() => setTab('mine')}
              className={`relative pb-3 text-sm font-semibold transition ${
                tab === 'mine'
                  ? 'text-emerald-700'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              My listings
              {tab === 'mine' && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-emerald-600" />
              )}
            </button>
          </div>

          {tab === 'mine' && (
            <button
              onClick={() => setCreating(true)}
              disabled={!verified}
              className="btn btn-primary mb-3 sm:mb-2"
            >
              <Icon name="plus" className="h-4 w-4" />
              Create listing
            </button>
          )}
        </div>

        {/* Browse medicines */}
        {tab === 'available' && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
                <input
                  aria-label="Search marketplace"
                  className="input pl-9"
                  placeholder="Search medicine name..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <button
                className="btn btn-secondary"
                onClick={available.reload}
              >
                <Icon name="repeat" className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {available.loading && !available.data ? (
              <LoadingBlock />
            ) : available.error ? (
              <div className="card">
                <ErrorState
                  message={available.error}
                  onRetry={available.reload}
                />
              </div>
            ) : !available.data?.listings.length ? (
              <div className="card">
                <EmptyState
                  title={
                    dsearch
                      ? 'No matching medicines found'
                      : 'No medicines listed yet'
                  }
                  body={
                    dsearch
                      ? 'Try another medicine name or check back later.'
                      : 'When verified pharmacies list surplus stock, it will appear here. You can also list your own available stock.'
                  }
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Available stock
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Medicines currently offered by partner pharmacies.
                    </p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    {availableCount} listings
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {available.data.listings.map((listing) => (
                    <article
                      key={listing.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                    >
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                              Medicine
                            </p>
                            <h3 className="mt-1 text-lg font-bold leading-snug text-gray-950">
                              {listing.medicine.name}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              {listing.medicine.strength} ·{' '}
                              {listing.medicine.dosageForm}
                            </p>
                          </div>

                          {listing.discountPercent > 0 && (
                            <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
                              {listing.discountPercent}% OFF
                            </span>
                          )}
                        </div>

                        <div className="my-4 border-t border-gray-100" />

                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                            <Icon name="pharmacy" className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800">
                              {listing.pharmacy?.name || 'Partner pharmacy'}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {[listing.pharmacy?.city, listing.pharmacy?.state]
                                .filter(Boolean)
                                .join(', ') || 'Location unavailable'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
                          <div>
                            <p className="text-xs text-gray-500">
                              Available quantity
                            </p>
                            <p className="mt-1 text-sm font-bold text-gray-900">
                              {listing.remaining} units
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Batch</p>
                            <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                              {listing.batchNumber}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs text-gray-500">
                              Offer price per unit
                            </p>
                            <p className="mt-1 text-xl font-bold text-gray-950">
                              {naira(listing.unitPrice)}
                            </p>
                            {listing.discountPercent > 0 && (
                              <p className="mt-0.5 text-xs text-gray-400">
                                <s>{naira(listing.originalPrice)}</s>
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              Expiry information
                            </p>
                            <p className="mt-1 text-xs font-semibold text-gray-700">
                              {expiryNote(listing.daysToExpiry)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 bg-gray-50/70 p-4">
                        <button
                          className="btn btn-primary w-full"
                          disabled={!verified}
                          onClick={() => setTarget(listing)}
                        >
                          Request this stock
                          <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <Pagination
                  page={available.data.pagination.page}
                  totalPages={available.data.pagination.totalPages}
                  total={available.data.pagination.total}
                  onPage={setPage}
                />
              </>
            )}
          </div>
        )}

        {/* My listings */}
        {tab === 'mine' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon name="package" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Your marketplace listings
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-gray-500">
                    Manage the stock you have offered to other pharmacies.
                    Review pending requests and update or withdraw your offers.
                  </p>
                </div>
              </div>
            </div>

            {mine.loading && !mine.data ? (
              <LoadingBlock />
            ) : mine.error ? (
              <div className="card">
                <ErrorState message={mine.error} onRetry={mine.reload} />
              </div>
            ) : !myListings.length ? (
              <div className="card">
                <EmptyState
                  title="Your marketplace is empty"
                  body="List eligible inventory to make your surplus stock available to other verified pharmacies."
                />
                <div className="flex justify-center pb-5">
                  <button
                    className="btn btn-primary"
                    disabled={!verified}
                    onClick={() => setCreating(true)}
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    List your first medicine
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="flex flex-col gap-2 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Your listed medicines
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {myListings.length} listing(s)
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={mine.reload}
                  >
                    <Icon name="repeat" className="h-4 w-4" />
                    Refresh
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px]">
                    <thead className="border-b border-gray-100 bg-gray-50">
                      <tr>
                        {[
                          'Medicine',
                          'Batch',
                          'Listed',
                          'Reserved',
                          'Transferred',
                          'Offer price',
                          'Requests',
                          'Status',
                          '',
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="th"
                            scope="col"
                          >
                            {heading || (
                              <span className="sr-only">Actions</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {myListings.map((listing) => {
                        const isOpen =
                          listing.status === 'AVAILABLE' ||
                          listing.status === 'PENDING';

                        return (
                          <tr key={listing.id} className="hover:bg-gray-50/70">
                            <td className="td">
                              <p className="font-semibold text-gray-900">
                                {listing.medicine.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {listing.medicine.strength} ·{' '}
                                {listing.medicine.dosageForm}
                              </p>
                            </td>

                            <td className="td">
                              <p>{listing.batchNumber}</p>
                              <p className="text-xs text-gray-500">
                                Exp. {formatDate(listing.expiryDate)}
                              </p>
                            </td>

                            <td className="td">{listing.quantity}</td>
                            <td className="td">{listing.reservedQty}</td>
                            <td className="td">{listing.completedQty}</td>

                            <td className="td">
                              <p className="font-semibold">
                                {naira(listing.unitPrice)}
                              </p>
                              {listing.discountPercent > 0 && (
                                <p className="text-xs text-emerald-700">
                                  {listing.discountPercent}% off
                                </p>
                              )}
                            </td>

                            <td className="td">
                              {listing.pendingRequests ?? 0}
                            </td>

                            <td className="td">
                              <ListingBadge status={listing.status} />
                            </td>

                            <td className="td">
                              {isOpen && (
                                <div className="flex gap-1">
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setEditing(listing)}
                                    aria-label={`Edit listing for ${listing.medicine.name}`}
                                  >
                                    <Icon
                                      name="edit"
                                      className="h-4 w-4"
                                    />
                                  </button>

                                  <button
                                    className="btn btn-ghost btn-sm text-red-600"
                                    onClick={() => setCancelling(listing)}
                                    aria-label={`Cancel listing for ${listing.medicine.name}`}
                                  >
                                    <Icon
                                      name="x"
                                      className="h-4 w-4"
                                    />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Request a transfer */}
      <RequestModal
        listing={target}
        onClose={() => setTarget(null)}
        onDone={() => {
          setTarget(null);
          toast.success(
            'Request sent. The supplier has been notified in the app.'
          );
          available.reload();
        }}
      />

      {/* Create listing */}
      <ListingModal
        open={creating}
        onClose={() => setCreating(false)}
        onDone={() => {
          setCreating(false);
          toast.success('Listed for transfer.');
          mine.reload();
        }}
      />

      {/* Edit listing */}
      <ListingModal
        open={!!editing}
        listing={editing}
        onClose={() => setEditing(null)}
        onDone={() => {
          setEditing(null);
          toast.success('Listing updated.');
          mine.reload();
        }}
      />

      {/* Cancel listing */}
      <ConfirmDialog
        open={!!cancelling}
        title="Cancel this listing?"
        confirmLabel="Cancel listing"
        busy={busy}
        onClose={() => setCancelling(null)}
        onConfirm={cancelListing}
        body={
          cancelling && (
            <>
              Withdraw{' '}
              <strong>
                {cancelling.medicine.name} {cancelling.medicine.strength}
              </strong>{' '}
              from the marketplace? Pending requests will be cancelled. If
              another pharmacy has already been accepted, reject that request
              first.
            </>
          )
        }
      />
    </div>
  );
}

function ListingModal({
  open,
  listing,
  onClose,
  onDone,
}: {
  open: boolean;
  listing?: Listing | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const items = useApi<{ items: InventoryItem[] }>(
    open && !listing ? '/inventory' : null,
    { eligible: 'true', pageSize: 100 }
  );

  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [discount, setDiscount] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;

    setError('');
    setErrs({});
    setItemId('');
    setQty(listing ? String(listing.quantity) : '');
    setDiscount(listing ? String(listing.discountPercent) : '0');
  }, [open, listing]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const quantity = Number(qty);
    const discountValue = Number(discount);
    const local: Record<string, string> = {};

    if (!listing && !itemId) {
      local.inventoryItemId = 'Choose an item to list.';
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      local.quantity = 'Enter a whole number, 1 or more.';
    }

    if (
      Number.isNaN(discountValue) ||
      discountValue < 0 ||
      discountValue > 90
    ) {
      local.discountPercent = 'Enter a discount from 0 to 90.';
    }

    if (Object.keys(local).length) {
      setErrs(local);
      return;
    }

    setBusy(true);
    setErrs({});
    setError('');

    try {
      if (listing) {
        await api(`/transfers/${listing.id}`, {
          method: 'PATCH',
          auth: true,
          body: {
            quantity,
            discountPercent: discountValue,
          },
        });
      } else {
        await api('/transfers', {
          method: 'POST',
          auth: true,
          body: {
            inventoryItemId: itemId,
            quantity,
            discountPercent: discountValue,
          },
        });
      }

      onDone();
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const chosen = items.data?.items.find((item) => item.id === itemId);

  return (
    <Modal
      open={open}
      title={listing ? 'Edit listing' : 'List inventory for transfer'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {listing ? (
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            {listing.medicine.name} {listing.medicine.strength}, batch{' '}
            {listing.batchNumber}.{' '}
            {listing.reservedQty + listing.completedQty > 0 &&
              `At least ${listing.reservedQty + listing.completedQty} unit(s) are already accepted or transferred.`}
          </p>
        ) : (
          <Field
            label="Inventory item"
            htmlFor="l-item"
            error={errs.inventoryItemId}
          >
            {items.loading ? (
              <p className="text-sm text-gray-500">
                Loading your stock…
              </p>
            ) : items.error ? (
              <p className="text-sm text-red-700">{items.error}</p>
            ) : !items.data?.items.length ? (
              <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                You have no in-date stock to list. Add inventory first.
              </p>
            ) : (
              <select
                id="l-item"
                className={`input ${
                  errs.inventoryItemId ? 'input-error' : ''
                }`}
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
              >
                <option value="">Select an inventory item…</option>
                {items.data.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.medicine.name} {item.medicine.strength} · batch{' '}
                    {item.batchNumber} · {item.quantity} in stock ·{' '}
                    {expiryNote(item.daysToExpiry)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Units to offer"
            htmlFor="l-qty"
            error={errs.quantity}
            hint={chosen ? `${chosen.quantity} on hand` : undefined}
          >
            <input
              id="l-qty"
              type="number"
              min={1}
              step={1}
              className={`input ${
                errs.quantity ? 'input-error' : ''
              }`}
              value={qty}
              onChange={(event) => setQty(event.target.value)}
            />
          </Field>

          <Field
            label="Discount (%)"
            htmlFor="l-disc"
            error={errs.discountPercent}
            hint={
              chosen
                ? `Selling price ${naira(chosen.sellingPrice)}`
                : '0 to 90'
            }
          >
            <input
              id="l-disc"
              type="number"
              min={0}
              max={90}
              step="0.5"
              className={`input ${
                errs.discountPercent ? 'input-error' : ''
              }`}
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </Field>
        </div>

        <div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
          Listed units stay in your inventory until a transfer is completed.
          A new discount applies to future requests only.
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>

          <button className="btn btn-primary" disabled={busy}>
            {busy
              ? 'Saving…'
              : listing
                ? 'Save changes'
                : 'List for transfer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
