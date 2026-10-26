'use client';
import { useState } from 'react';
import { RequestBadge } from '@/components/StatusBadge';
import { EmptyState, ErrorState, Field, LoadingBlock, Modal, Pagination, StatCard } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { formatDate, formatDateTime, naira } from '@/lib/format';
import type { Pagination as Pg, RequestStatus, TransferRequestRow } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Dir = 'incoming' | 'outgoing';
type Counts = Record<RequestStatus | 'total', number>;
type Action = 'accept' | 'reject' | 'cancel' | 'complete';

const ACTION_COPY: Record<Action, { title: string; confirm: string; body: string; danger?: boolean }> = {
  accept: { title: 'Accept this request?', confirm: 'Accept and reserve stock', body: 'The requested units are reserved for this pharmacy. They stay in your inventory until the other pharmacy confirms receipt.' },
  reject: { title: 'Reject this request?', confirm: 'Reject request', body: 'The requesting pharmacy is told. If you already accepted it, the reserved units are released.', danger: true },
  cancel: { title: 'Cancel your request?', confirm: 'Cancel request', body: 'If the supplier had accepted, their reserved units are released.', danger: true },
  complete: { title: 'Confirm you received this stock?', confirm: 'Confirm receipt', body: 'Only confirm after the medicine has physically arrived. The units are removed from the supplier’s stock and added to yours with the source recorded. This cannot be undone.' },
};

export default function TransferRequestsPage() {
  const toast = useToast();
  const [dir, setDir] = useState<Dir>('incoming');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [act, setAct] = useState<{ row: TransferRequestRow; action: Action } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const summary = useApi<{ incoming: Counts; outgoing: Counts }>('/transfer-requests/summary');
  const list = useApi<{ requests: TransferRequestRow[]; pagination: Pg }>('/transfer-requests', { direction: dir, status, page, pageSize: 10 });
  const c = summary.data?.[dir];

  async function confirm() {
    if (!act) return;
    setBusy(true);
    try {
      await api(`/transfer-requests/${act.row.id}/${act.action}`, { method: 'POST', auth: true, body: { note } });
      toast.success({ accept: 'Request accepted and stock reserved.', reject: 'Request rejected.', cancel: 'Request cancelled.', complete: 'Receipt confirmed. The stock is now in your inventory.' }[act.action]);
      setAct(null);
      setNote('');
      summary.reload();
      list.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const copy = act ? ACTION_COPY[act.action] : null;
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Direction" className="inline-flex rounded-xl bg-gray-100 p-1">
        {([['incoming', 'Incoming (you supply)'], ['outgoing', 'Outgoing (you requested)']] as [Dir, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={dir === k} onClick={() => { setDir(k); setPage(1); setStatus(''); }} className={`rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-600 ${dir === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>{label}</button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total" value={c?.total ?? '…'} icon="inbox" tone="gray" />
        <StatCard label="Pending" value={c?.PENDING ?? '…'} icon="alert" tone="orange" />
        <StatCard label="Accepted, awaiting receipt" value={c?.ACCEPTED ?? '…'} icon="repeat" tone="blue" />
        <StatCard label="Completed" value={c?.COMPLETED ?? '…'} icon="check" tone="green" />
        <StatCard label="Rejected or cancelled" value={c ? c.REJECTED + c.CANCELLED : '…'} icon="x" tone="red" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
          <p className="text-sm text-gray-600">&ldquo;Accepted&rdquo; means stock is reserved and awaiting hand-over. Delivery is arranged between the pharmacies and is not tracked here.</p>
          <select aria-label="Filter by status" className="input w-44 shrink-0" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {['PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        {list.loading && !list.data ? <LoadingBlock /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data?.requests.length ? (
          <EmptyState title="No requests here" body={dir === 'incoming' ? 'When another pharmacy requests your listed stock, it appears here.' : 'Request stock from the Transfers page and track it here.'} />
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {list.data.requests.map((r) => (
                <li key={r.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{r.medicine.name} {r.medicine.strength} <span className="font-normal text-gray-500">· {r.quantity} units</span></p>
                      <p className="text-sm text-gray-600">{dir === 'incoming' ? 'Requested by' : 'Supplier:'} {r.partner.name} ({r.partner.city}, {r.partner.state}){r.partner.phone ? ` · ${r.partner.phone}` : ''}</p>
                      <p className="text-xs text-gray-500">Batch {r.batchNumber} · expires {formatDate(r.expiryDate)} · {naira(r.unitPrice)} per unit · {naira(r.total)} total</p>
                      {r.message && <p className="mt-1 text-xs italic text-gray-500">&ldquo;{r.message}&rdquo;</p>}
                      <p className="mt-1 text-xs text-gray-400">Requested {formatDateTime(r.createdAt)}</p>
                    </div>
                    <RequestBadge status={r.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dir === 'incoming' && r.status === 'PENDING' && <button className="btn btn-primary btn-sm" onClick={() => setAct({ row: r, action: 'accept' })}>Accept</button>}
                    {dir === 'incoming' && (r.status === 'PENDING' || r.status === 'ACCEPTED') && <button className="btn btn-secondary btn-sm" onClick={() => setAct({ row: r, action: 'reject' })}>Reject</button>}
                    {dir === 'outgoing' && r.status === 'ACCEPTED' && <button className="btn btn-primary btn-sm" onClick={() => setAct({ row: r, action: 'complete' })}>Confirm receipt</button>}
                    {dir === 'outgoing' && (r.status === 'PENDING' || r.status === 'ACCEPTED') && <button className="btn btn-secondary btn-sm" onClick={() => setAct({ row: r, action: 'cancel' })}>Cancel request</button>}
                    <button className="btn btn-ghost btn-sm" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide history' : 'View history'}</button>
                  </div>
                  {open === r.id && <History id={r.id} />}
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 px-4"><Pagination page={list.data.pagination.page} totalPages={list.data.pagination.totalPages} total={list.data.pagination.total} onPage={setPage} /></div>
          </>
        )}
      </div>

      <Modal open={!!act} title={copy?.title ?? ''} onClose={() => !busy && setAct(null)}>
        {act && copy && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{act.row.quantity} × {act.row.medicine.name} {act.row.medicine.strength}. {copy.body}</p>
            <Field label="Note (optional)" htmlFor="a-note"><input id="a-note" className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setAct(null)} disabled={busy}>Back</button>
              <button className={`btn ${copy.danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={busy}>{busy ? 'Working…' : copy.confirm}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function History({ id }: { id: string }) {
  const { data, error, loading } = useApi<{ events: { id: string; type: string; actor: string; quantity: number; note: string | null; createdAt: string }[] }>(`/transfer-requests/${id}/events`);
  if (loading) return <p className="mt-3 text-xs text-gray-500">Loading history…</p>;
  if (error) return <p className="mt-3 text-xs text-red-700">{error}</p>;
  return (
    <ol className="mt-3 space-y-1.5 border-l-2 border-gray-100 pl-4 text-xs text-gray-600">
      {data?.events.map((e) => (
        <li key={e.id}><span className="font-medium text-gray-800">{e.type[0] + e.type.slice(1).toLowerCase()}</span> by {e.actor} · {e.quantity} units · {formatDateTime(e.createdAt)}{e.note ? ` · “${e.note}”` : ''}</li>
      ))}
    </ol>
  );
}
