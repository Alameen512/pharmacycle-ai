'use client';
import { useEffect, useState } from 'react';
import { RequestModal } from '@/components/RequestModal';
import { ListingBadge } from '@/components/StatusBadge';
import { ConfirmDialog, EmptyState, ErrorState, Field, Icon, LoadingBlock, Modal, Notice, Pagination } from '@/components/ui';
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
  const verified = session?.kind === 'pharmacy' && session.pharmacy.verificationStatus === 'VERIFIED';
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
    const p = new URLSearchParams(window.location.search);
    if (p.get('tab') === 'mine') setTab('mine');
    if (p.get('new')) { setTab('mine'); setCreating(true); }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => { setDsearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const available = useApi<{ listings: Listing[]; pagination: Pg }>(tab === 'available' ? '/transfers/available' : null, { search: dsearch, page, pageSize: 12 });
  const mine = useApi<{ listings: Listing[] }>(tab === 'mine' ? '/transfers/mine' : null);

  async function cancelListing() {
    if (!cancelling) return;
    setBusy(true);
    try {
      const r = await api<{ cancelledRequests: number }>(`/transfers/${cancelling.id}/cancel`, { method: 'POST', auth: true, body: {} });
      toast.success(r.cancelledRequests ? `Listing cancelled. ${r.cancelledRequests} pending request(s) were cancelled.` : 'Listing cancelled.');
      setCancelling(null);
      mine.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {!verified && <Notice tone="orange">Transfers are available to verified pharmacies only. You can browse listings, but requesting and listing stock are switched off until your pharmacy is verified.</Notice>}

      <div role="tablist" aria-label="Transfers" className="inline-flex rounded-xl bg-gray-100 p-1">
        {([['available', 'Available from others'], ['mine', 'My listings']] as [Tab, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-600 ${tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>{label}</button>
        ))}
      </div>

      {tab === 'available' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input aria-label="Search listings by medicine" className="input pl-9" placeholder="Search by medicine name" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-secondary" onClick={available.reload}>Refresh list</button>
          </div>
          {available.loading && !available.data ? <LoadingBlock /> : available.error ? <div className="card"><ErrorState message={available.error} onRetry={available.reload} /></div> : !available.data?.listings.length ? (
            <div className="card"><EmptyState title={dsearch ? 'No listings match your search' : 'No surplus listed right now'} body="Verified partners list in-date stock here. Check back later, or list your own surplus." /></div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {available.data.listings.map((l) => (
                  <article key={l.id} className="card flex flex-col p-5">
                    <h3 className="font-semibold text-gray-900">{l.medicine.name} <span className="font-normal text-gray-500">{l.medicine.strength}</span></h3>
                    <p className="text-xs text-gray-500">{l.medicine.dosageForm} · batch {l.batchNumber}</p>
                    <p className="mt-3 text-sm text-gray-700">{l.pharmacy?.name}</p>
                    <p className="text-xs text-gray-500">{l.pharmacy?.city}, {l.pharmacy?.state}</p>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{naira(l.unitPrice)}</p>
                        {l.discountPercent > 0 && <p className="text-xs text-gray-500"><s>{naira(l.originalPrice)}</s> · {l.discountPercent}% off</p>}
                      </div>
                      <div className="text-right text-xs text-gray-500"><p>{l.remaining} units</p><p>{expiryNote(l.daysToExpiry)}</p></div>
                    </div>
                    <button className="btn btn-primary mt-4" disabled={!verified} onClick={() => setTarget(l)}>Request transfer</button>
                  </article>
                ))}
              </div>
              <Pagination page={available.data.pagination.page} totalPages={available.data.pagination.totalPages} total={available.data.pagination.total} onPage={setPage} />
            </>
          )}
        </>
      )}

      {tab === 'mine' && (
        <div className="card">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
            <p className="text-sm text-gray-600">Stock you have offered to other pharmacies.</p>
            <button className="btn btn-primary" disabled={!verified} onClick={() => setCreating(true)}><Icon name="plus" className="h-4 w-4" />List inventory for transfer</button>
          </div>
          {mine.loading && !mine.data ? <LoadingBlock /> : mine.error ? <ErrorState message={mine.error} onRetry={mine.reload} /> : !mine.data?.listings.length ? (
            <EmptyState title="You have not listed anything" body="List surplus or near-expiry stock so verified partners can request it." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-gray-100 bg-gray-50"><tr>{['Medicine', 'Batch', 'Listed', 'Reserved', 'Transferred', 'Offer price', 'Pending requests', 'Status', ''].map((h) => <th key={h} className="th" scope="col">{h || <span className="sr-only">Actions</span>}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {mine.data.listings.map((l) => {
                    const open = l.status === 'AVAILABLE' || l.status === 'PENDING';
                    return (
                      <tr key={l.id}>
                        <td className="td"><p className="font-medium text-gray-900">{l.medicine.name}</p><p className="text-xs text-gray-500">{l.medicine.strength} · {l.medicine.dosageForm}</p></td>
                        <td className="td"><p>{l.batchNumber}</p><p className="text-xs text-gray-500">exp {formatDate(l.expiryDate)}</p></td>
                        <td className="td">{l.quantity}</td>
                        <td className="td">{l.reservedQty}</td>
                        <td className="td">{l.completedQty}</td>
                        <td className="td">{naira(l.unitPrice)}{l.discountPercent > 0 && <p className="text-xs text-gray-500">{l.discountPercent}% off</p>}</td>
                        <td className="td">{l.pendingRequests ?? 0}</td>
                        <td className="td"><ListingBadge status={l.status} /></td>
                        <td className="td">
                          {open && (
                            <div className="flex gap-1">
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(l)} aria-label={`Edit listing for ${l.medicine.name}`}><Icon name="edit" className="h-4 w-4" /></button>
                              <button className="btn btn-ghost btn-sm text-red-600" onClick={() => setCancelling(l)} aria-label={`Cancel listing for ${l.medicine.name}`}><Icon name="x" className="h-4 w-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <RequestModal listing={target} onClose={() => setTarget(null)} onDone={() => { setTarget(null); toast.success('Request sent. The supplier has been notified in the app.'); available.reload(); }} />
      <ListingModal open={creating} onClose={() => setCreating(false)} onDone={() => { setCreating(false); toast.success('Listed for transfer.'); mine.reload(); }} />
      <ListingModal open={!!editing} listing={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); toast.success('Listing updated.'); mine.reload(); }} />
      <ConfirmDialog open={!!cancelling} title="Cancel this listing?" confirmLabel="Cancel listing" busy={busy} onClose={() => setCancelling(null)} onConfirm={cancelListing}
        body={cancelling && <>Withdraw <strong>{cancelling.medicine.name} {cancelling.medicine.strength}</strong> from the marketplace? Pending requests will be cancelled. If another pharmacy has already been accepted, reject that request first.</>} />
    </div>
  );
}

function ListingModal({ open, listing, onClose, onDone }: { open: boolean; listing?: Listing | null; onClose: () => void; onDone: () => void }) {
  const items = useApi<{ items: InventoryItem[] }>(open && !listing ? '/inventory' : null, { eligible: 'true', pageSize: 100 });
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = Number(qty);
    const d = Number(discount);
    const local: Record<string, string> = {};
    if (!listing && !itemId) local.inventoryItemId = 'Choose an item to list.';
    if (!Number.isInteger(q) || q < 1) local.quantity = 'Enter a whole number, 1 or more.';
    if (Number.isNaN(d) || d < 0 || d > 90) local.discountPercent = 'Enter a discount from 0 to 90.';
    if (Object.keys(local).length) return setErrs(local);
    setBusy(true);
    setErrs({});
    setError('');
    try {
      if (listing) await api(`/transfers/${listing.id}`, { method: 'PATCH', auth: true, body: { quantity: q, discountPercent: d } });
      else await api('/transfers', { method: 'POST', auth: true, body: { inventoryItemId: itemId, quantity: q, discountPercent: d } });
      onDone();
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const chosen = items.data?.items.find((i) => i.id === itemId);
  return (
    <Modal open={open} title={listing ? 'Edit listing' : 'List inventory for transfer'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        {listing ? (
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{listing.medicine.name} {listing.medicine.strength}, batch {listing.batchNumber}. {listing.reservedQty + listing.completedQty > 0 && `At least ${listing.reservedQty + listing.completedQty} unit(s) are already accepted or transferred.`}</p>
        ) : (
          <Field label="Inventory item" htmlFor="l-item" error={errs.inventoryItemId}>
            {items.loading ? <p className="text-sm text-gray-500">Loading your stock…</p> : items.error ? <p className="text-sm text-red-700">{items.error}</p> : !items.data?.items.length ? (
              <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">You have no in-date stock to list. Add inventory first.</p>
            ) : (
              <select id="l-item" className={`input ${errs.inventoryItemId ? 'input-error' : ''}`} value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Select…</option>
                {items.data.items.map((i) => <option key={i.id} value={i.id}>{i.medicine.name} {i.medicine.strength} · batch {i.batchNumber} · {i.quantity} in stock · {expiryNote(i.daysToExpiry)}</option>)}
              </select>
            )}
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Units to offer" htmlFor="l-qty" error={errs.quantity} hint={chosen ? `${chosen.quantity} on hand` : undefined}><input id="l-qty" type="number" min={1} step={1} className={`input ${errs.quantity ? 'input-error' : ''}`} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Discount (%)" htmlFor="l-disc" error={errs.discountPercent} hint={chosen ? `Selling price ${naira(chosen.sellingPrice)}` : '0 to 90'}><input id="l-disc" type="number" min={0} max={90} step="0.5" className={`input ${errs.discountPercent ? 'input-error' : ''}`} value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
        </div>
        <p className="text-xs text-gray-500">Listed units stay in your inventory until a transfer is completed. A new discount applies to future requests only.</p>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : listing ? 'Save changes' : 'List for transfer'}</button></div>
      </form>
    </Modal>
  );
}
