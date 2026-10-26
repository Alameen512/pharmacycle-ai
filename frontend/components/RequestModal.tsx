'use client';
import { useState } from 'react';
import { api, errorMessage, fieldErrors } from '@/lib/api';
import { expiryNote, formatDate, naira } from '@/lib/format';
import type { Listing } from '@/lib/types';
import { Field, Modal } from './ui';

export function RequestModal({ listing, onClose, onDone }: { listing: Listing | null; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!listing) return;
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 1) return setErrs({ quantity: 'Enter a whole number, 1 or more.' });
    if (n > listing.remaining) return setErrs({ quantity: `Only ${listing.remaining} unit(s) are available.` });
    setBusy(true);
    setErrs({});
    setError('');
    try {
      await api(`/transfers/${listing.id}/request`, { method: 'POST', auth: true, body: { quantity: n, message } });
      setQty('');
      setMessage('');
      onDone();
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!listing} title="Request transfer" onClose={onClose}>
      {listing && (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="rounded-xl bg-gray-50 p-4 text-sm">
            <p className="font-medium text-gray-900">{listing.medicine.name} {listing.medicine.strength} · {listing.medicine.dosageForm}</p>
            <p className="text-gray-600">From {listing.pharmacy?.name} ({listing.pharmacy?.city}, {listing.pharmacy?.state})</p>
            <p className="mt-1 text-gray-600">Batch {listing.batchNumber} · expires {formatDate(listing.expiryDate)} ({expiryNote(listing.daysToExpiry)})</p>
            <p className="mt-1 text-gray-900">{naira(listing.unitPrice)} per unit{listing.discountPercent > 0 && <span className="text-gray-500"> ({listing.discountPercent}% off {naira(listing.originalPrice)})</span>} · {listing.remaining} available</p>
          </div>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
          <Field label="Quantity" htmlFor="r-qty" error={errs.quantity}><input id="r-qty" type="number" min={1} max={listing.remaining} step={1} className={`input ${errs.quantity ? 'input-error' : ''}`} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Message (optional)" htmlFor="r-msg" error={errs.message}><input id="r-msg" className="input" maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
          <p className="text-xs text-gray-500">Sending a request does not reserve stock. The supplier reserves it when they accept. Payment and delivery are arranged directly between pharmacies.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
