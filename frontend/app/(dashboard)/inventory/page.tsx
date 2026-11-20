
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryForm } from '@/components/InventoryForm';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  LoadingBlock,
  Modal,
  Pagination,
  StatCard,
} from '@/components/ui';
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

    return () =>
      window.removeEventListener('pharmacycle:open-inventory-add', openAdd);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDsearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const list = useApi<{
    items: InventoryItem[];
    pagination: Pg;
  }>('/inventory', {
    search: dsearch,
    status,
    page,
    pageSize: 10,
  });

  const stats = useApi<{
    total: number;
    lowStock: number;
    nearExpiry: number;
    expired: number;
  }>('/inventory/stats');

  const cfg = useApi<AppConfig>('/config');

  const refresh = () => {
    list.reload();
    stats.reload();
  };

  const closeAdd = () => {
    setAdding(false);

    if (new URLSearchParams(window.location.search).has('add')) {
      router.replace('/inventory', { scroll: false });
    }
  };

  async function remove() {
    if (!deleting) return;

    setBusy(true);

    try {
      await api(`/inventory/${deleting.id}`, {
        method: 'DELETE',
        auth: true,
      });

      toast.success(`${deleting.medicine.name} removed from inventory.`);
      setDeleting(null);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const hasFilters = Boolean(dsearch || status);

  function clearFilters() {
    setSearch('');
    setDsearch('');
    setStatus('');
    setPage(1);
  }

  function InventoryActions({ item }: { item: InventoryItem }) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSelling(item)}
          aria-label={`Record a sale of ${item.medicine.name}`}
          title="Record sale"
        >
          <Icon name="dollar" className="h-4 w-4" />
          <span className="sm:hidden">Sale</span>
        </button>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setEditing(item)}
          aria-label={`Edit ${item.medicine.name}`}
          title="Edit medicine"
        >
          <Icon name="edit" className="h-4 w-4" />
          <span className="sm:hidden">Edit</span>
        </button>

        <button
          className="btn btn-ghost btn-sm text-red-600"
          onClick={() => setDeleting(item)}
          aria-label={`Delete ${item.medicine.name}`}
          title="Delete medicine"
        >
          <Icon name="trash" className="h-4 w-4" />
          <span className="sm:hidden">Delete</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      {/* Page heading */}
      <section className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
              Stock management
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your medicines, monitor stock levels and track expiry dates.
          </p>
        </div>

        <button
          className="btn btn-primary shrink-0"
          onClick={() => setAdding(true)}
        >
          <Icon name="plus" className="h-4 w-4" />
          Add medicine
        </button>
      </section>

      {/* Inventory overview */}
      <section className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total stock items"
          value={stats.data?.total ?? '…'}
          icon="package"
          tone="green"
        />
        <StatCard
          label="Low stock"
          value={stats.data?.lowStock ?? '…'}
          icon="alert"
          tone="orange"
        />
        <StatCard
          label="Near expiry"
          value={stats.data?.nearExpiry ?? '…'}
          icon="alert"
          tone="red"
        />
        <StatCard
          label="Expired"
          value={stats.data?.expired ?? '…'}
          icon="alert"
          tone="blue"
        />
      </section>

      {/* Inventory list */}
      <section className="card min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-gray-900">All medicines</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Search and manage the stock recorded in your pharmacy.
              </p>
            </div>

            {list.data && (
              <span className="text-xs font-medium text-gray-500">
                {list.data.pagination.total} records
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              />
              <input
                aria-label="Search inventory"
                className="input w-full min-w-0 pl-9"
                placeholder="Search medicine, batch or NAFDAC number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              aria-label="Filter by stock status"
              className="input w-full sm:w-48"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {Object.entries(STOCK_META).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                className="btn btn-secondary btn-sm shrink-0"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {list.loading && !list.data ? (
          <LoadingBlock />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={refresh} />
        ) : !list.data?.items.length ? (
          <EmptyState
            title={hasFilters ? 'No matching medicines' : 'Your inventory is empty'}
            body={
              hasFilters
                ? 'Try another search or clear your filters to see more medicines.'
                : 'Add your first medicine to start managing your pharmacy stock.'
            }
            action={
              hasFilters ? (
                <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setAdding(true)}
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Add your first medicine
                </button>
              )
            }
          />
        ) : (
          <>
            {/* Desktop inventory table */}
            <div className="hidden w-full min-w-0 overflow-x-auto lg:block">
              <table className="w-full min-w-[950px]">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {[
                      'Medicine',
                      'Category',
                      'Batch details',
                      'Quantity',
                      'Selling price',
                      'Expiry date',
                      'Status',
                      'Actions',
                    ].map((heading) => (
                      <th key={heading} className="th" scope="col">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {list.data.items.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-gray-50/70">
                      <td className="td">
                        <p className="max-w-[220px] break-words font-semibold text-gray-900">
                          {item.medicine.name}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {item.medicine.strength} · {item.medicine.dosageForm}
                        </p>
                      </td>

                      <td className="td">{item.medicine.category}</td>

                      <td className="td">
                        <p className="font-medium text-gray-800">
                          {item.batchNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {item.nafdacRegNo || 'No NAFDAC number'}
                        </p>
                      </td>

                      <td className="td">
                        <p className="font-semibold text-gray-900">
                          {item.quantity}
                        </p>
                        {item.reservedQty > 0 && (
                          <p className="mt-0.5 text-xs text-blue-700">
                            {item.reservedQty} reserved
                          </p>
                        )}
                      </td>

                      <td className="td whitespace-nowrap font-medium">
                        {naira(item.sellingPrice)}
                      </td>

                      <td className="td">
                        <p className="whitespace-nowrap font-medium text-gray-800">
                          {formatDate(item.expiryDate)}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {expiryNote(item.daysToExpiry)}
                        </p>
                      </td>

                      <td className="td">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="td">
                        <InventoryActions item={item} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile and tablet inventory cards */}
            <div className="grid min-w-0 gap-3 p-3 lg:hidden">
              {list.data.items.map((item) => (
                <article
                  key={item.id}
                  className="min-w-0 rounded-xl border border-gray-100 bg-white p-4"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-gray-900">
                        {item.medicine.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.medicine.strength} · {item.medicine.dosageForm}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {item.quantity} units
                      </p>
                      {item.reservedQty > 0 && (
                        <p className="mt-0.5 text-xs text-blue-700">
                          {item.reservedQty} reserved
                        </p>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Selling price</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {naira(item.sellingPrice)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Batch number</p>
                      <p className="mt-1 break-words text-sm font-medium text-gray-800">
                        {item.batchNumber}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Expiry date</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {formatDate(item.expiryDate)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {expiryNote(item.daysToExpiry)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                    <p className="min-w-0 break-words text-xs text-gray-500">
                      {item.medicine.category}
                      {item.nafdacRegNo ? ` · ${item.nafdacRegNo}` : ''}
                    </p>
                    <InventoryActions item={item} />
                  </div>
                </article>
              ))}
            </div>

            <div className="min-w-0 border-t border-gray-100 px-4">
              <Pagination
                page={list.data.pagination.page}
                totalPages={list.data.pagination.totalPages}
                total={list.data.pagination.total}
                onPage={setPage}
              />
            </div>
          </>
        )}
      </section>

      {/* Add medicine */}
      <Modal open={adding} title="Add medicine" size="lg" onClose={closeAdd}>
        <InventoryForm
          config={cfg.data}
          onCancel={closeAdd}
          onSaved={(saved) => {
            closeAdd();
            toast.success(`${saved.medicine.name} added.`);
            refresh();
          }}
        />
      </Modal>

      {/* Edit medicine */}
      <Modal
        open={!!editing}
        title="Edit medicine"
        size="lg"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <InventoryForm
            item={editing}
            config={cfg.data}
            onCancel={() => setEditing(null)}
            onSaved={(saved) => {
              setEditing(null);
              toast.success(`${saved.medicine.name} updated.`);
              refresh();
            }}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleting}
        title="Delete this item?"
        confirmLabel="Delete item"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        body={
          deleting && (
            <>
              Remove{' '}
              <strong>
                {deleting.medicine.name} {deleting.medicine.strength}
              </strong>{' '}
              (batch {deleting.batchNumber}, {deleting.quantity} units) from
              your inventory? Past transfer records are kept. Items with open
              transfer listings cannot be deleted.
            </>
          )
        }
      />

      {/* Record sale */}
      <SaleModal
        item={selling}
        onClose={() => setSelling(null)}
        onDone={() => {
          setSelling(null);
          toast.success('Sale recorded and stock updated.');
          refresh();
        }}
      />
    </div>
  );
}

function SaleModal({
  item,
  onClose,
  onDone,
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [qty, setQty] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!item) return;

    const quantity = Number(qty);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return setErrs({
        quantity: 'Enter a whole number, 1 or more.',
      });
    }

    setBusy(true);
    setErrs({});
    setError('');

    try {
      await api(`/inventory/${item.id}/sale`, {
        method: 'POST',
        auth: true,
        body: { quantity, date },
      });

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
        <form onSubmit={submit} className="min-w-0 space-y-4" noValidate>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="font-semibold text-gray-900">
              {item.medicine.name} {item.medicine.strength}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Batch {item.batchNumber} · {item.quantity} units recorded
            </p>
            <p className="mt-2 text-xs text-gray-600">
              Recording sales helps improve demand forecasts and restock insights.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <Field label="Units sold" htmlFor="s-qty" error={errs.quantity}>
            <input
              id="s-qty"
              type="number"
              min={1}
              step={1}
              className={`input ${errs.quantity ? 'input-error' : ''}`}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>

          <Field
            label="Sale date (optional, defaults to now)"
            htmlFor="s-date"
            error={errs.date}
          >
            <input
              id="s-date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>

            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Record sale'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
