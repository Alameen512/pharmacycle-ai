'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryForm } from '@/components/InventoryForm';
import { ConfirmDialog, EmptyState, ErrorState, Field, Icon, LoadingBlock, Modal, Pagination, StatCard } from '@/components/ui';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/contexts/ToastContext';
import { api, errorMessage, fieldErrors } from '@/lib/api';
import { expiryNote, formatDate, naira, STOCK_META } from '@/lib/format';
import type { AppConfig, InventoryItem, Pagination as Pg } from '@/lib/types';
import { useApi } from '@/lib/useApi';

export default function InventoryPage() {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [dsearch, setDsearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [selling, setSelling] = useState<InventoryItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextStatus = params.get('status');
    if (nextStatus) setStatus(nextStatus);
    if (params.has('add')) setAdding(true);
    const openAdd = () => setAdding(true);
    window.addEventListener('pharmacycle:open-inventory-add', openAdd);
    return () => window.removeEventListener('pharmacycle:open-inventory-add', openAdd);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => { setDsearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useApi<{ items: InventoryItem[]; pagination: Pg }>('/inventory', { search: dsearch, status, page, pageSize: 10 });
  const stats = useApi<{ total: number; lowStock: number; nearExpiry: number; expired: number }>('/inventory/stats');
  const cfg = useApi<AppConfig>('/config');
  const refresh = () => { list.reload(); stats.reload(); };
  const closeAdd = () => {
    setAdding(false);
    if (new URLSearchParams(window.location.search).has('add')) router.replace('/inventory', { scroll: false });
  };

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/inventory/${deleting.id}`, { method: 'DELETE', auth: true });
      toast.success(`${deleting.medicine.name} removed from inventory.`);
      setDeleting(null);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Items" value={stats.data?.total ?? '…'} icon="package" tone="green" />
        <StatCard label="Low Stock Items" value={stats.data?.lowStock ?? '…'} icon="alert" tone="orange" />
        <StatCard label="Near Expiry Items" value={stats.data?.nearExpiry ?? '…'} icon="alert" tone="red" />
        <StatCard label="Expired Items" value={stats.data?.expired ?? '…'} icon="alert" tone="blue" />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input aria-label="Search inventory" className="input pl-9" placeholder="Search name, batch or NAFDAC number" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select aria-label="Filter by status" className="input sm:w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {Object.entries(STOCK_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => { setDsearch(search); setPage(1); list.reload(); }}>Search</button>
          <button className="btn btn-primary lg:hidden" onClick={() => setAdding(true)}><Icon name="plus" className="h-4 w-4" />Add medicine</button>
        </div>

        {list.loading && !list.data ? <LoadingBlock /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data?.items.length ? (
          <EmptyState title={dsearch || status ? 'No records match' : 'No inventory yet'} body={dsearch || status ? 'Try clearing the search or status filter.' : 'Add your first medicine, or scan a label to fill the form for you.'} action={!dsearch && !status ? <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>Add medicine</button> : undefined} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead className="border-b border-gray-100 bg-gray-50"><tr>
                  {['Medicine', 'Category', 'Batch / NAFDAC no.', 'Quantity', 'Selling price', 'Expiry', 'Status', ''].map((h) => <th key={h} className="th" scope="col">{h || <span className="sr-only">Actions</span>}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {list.data.items.map((i) => (
                    <tr key={i.id}>
                      <td className="td"><p className="font-medium text-gray-900">{i.medicine.name}</p><p className="text-xs text-gray-500">{i.medicine.strength} · {i.medicine.dosageForm}</p></td>
                      <td className="td">{i.medicine.category}</td>
                      <td className="td"><p>{i.batchNumber}</p><p className="text-xs text-gray-500">{i.nafdacRegNo || 'No NAFDAC no.'}</p></td>
                      <td className="td">{i.quantity}{i.reservedQty > 0 && <p className="text-xs text-blue-700">{i.reservedQty} reserved</p>}</td>
                      <td className="td">{naira(i.sellingPrice)}</td>
                      <td className="td"><p>{formatDate(i.expiryDate)}</p><p className="text-xs text-gray-500">{expiryNote(i.daysToExpiry)}</p></td>
                      <td className="td"><StatusBadge status={i.status} /></td>
                      <td className="td">
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-sm" onClick={() => setSelling(i)} aria-label={`Record a sale of ${i.medicine.name}`} title="Record sale"><Icon name="dollar" className="h-4 w-4" /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(i)} aria-label={`Edit ${i.medicine.name}`} title="Edit"><Icon name="edit" className="h-4 w-4" /></button>
                          <button className="btn btn-ghost btn-sm text-red-600" onClick={() => setDeleting(i)} aria-label={`Delete ${i.medicine.name}`} title="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-4"><Pagination page={list.data.pagination.page} totalPages={list.data.pagination.totalPages} total={list.data.pagination.total} onPage={setPage} /></div>
          </>
        )}
      </div>

      <Modal open={adding} title="Add medicine" size="lg" onClose={closeAdd}>
        <InventoryForm config={cfg.data} onCancel={closeAdd} onSaved={(s) => { closeAdd(); toast.success(`${s.medicine.name} added.`); refresh(); }} />
      </Modal>
      <Modal open={!!editing} title="Edit medicine" size="lg" onClose={() => setEditing(null)}>
        {editing && <InventoryForm item={editing} config={cfg.data} onCancel={() => setEditing(null)} onSaved={(s) => { setEditing(null); toast.success(`${s.medicine.name} updated.`); refresh(); }} />}
      </Modal>
      <ConfirmDialog open={!!deleting} title="Delete this item?" confirmLabel="Delete item" busy={busy} onClose={() => setDeleting(null)} onConfirm={remove}
        body={deleting && <>Remove <strong>{deleting.medicine.name} {deleting.medicine.strength}</strong> (batch {deleting.batchNumber}, {deleting.quantity} units) from your inventory? Past transfer records are kept. Items with open transfer listings cannot be deleted.</>} />
      <SaleModal item={selling} onClose={() => setSelling(null)} onDone={() => { setSelling(null); toast.success('Sale recorded and stock updated.'); refresh(); }} />
    </div>
  );
}

function SaleModal({ item, onClose, onDone }: { item: InventoryItem | null; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 1) return setErrs({ quantity: 'Enter a whole number, 1 or more.' });
    setBusy(true);
    setErrs({});
    setError('');
    try {
      await api(`/inventory/${item.id}/sale`, { method: 'POST', auth: true, body: { quantity: n, date } });
      setQty('');
      setDate('');
      onDone();
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={!!item} title="Record a sale" onClose={onClose}>
      {item && (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <p className="text-sm text-gray-600">{item.medicine.name} {item.medicine.strength}, batch {item.batchNumber}. In stock: {item.quantity}. Sales feed the demand forecast and restock insights.</p>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
          <Field label="Units sold" htmlFor="s-qty" error={errs.quantity}><input id="s-qty" type="number" min={1} step={1} className={`input ${errs.quantity ? 'input-error' : ''}`} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Sale date (optional, defaults to now)" htmlFor="s-date" error={errs.date}><input id="s-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Record sale'}</button></div>
        </form>
      )}
    </Modal>
  );
}
