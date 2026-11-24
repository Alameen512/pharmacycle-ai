
'use client';

import { useEffect, useRef, useState } from 'react';
import { RequestBadge } from '@/components/StatusBadge';
import {
  EmptyState,
  ErrorState,
  Field,
  Icon,
  LoadingBlock,
  Modal,
  Pagination,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { formatDate, formatDateTime, naira } from '@/lib/format';
import type {
  Pagination as Pg,
  RequestStatus,
  TransferRequestRow,
} from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Dir = 'incoming' | 'outgoing';
type Counts = Record<RequestStatus | 'total', number>;
type Action = 'accept' | 'reject' | 'cancel' | 'complete';

const ACTION_COPY: Record<
  Action,
  { title: string; confirm: string; body: string; danger?: boolean }
> = {
  accept: {
    title: 'Accept this request?',
    confirm: 'Accept and reserve stock',
    body: 'The requested units will be reserved for this pharmacy. They remain in your inventory until the receiving pharmacy confirms receipt.',
  },
  reject: {
    title: 'Reject this request?',
    confirm: 'Reject request',
    body: 'The requesting pharmacy will be notified. If you already accepted the request, the reserved units will be released.',
    danger: true,
  },
  cancel: {
    title: 'Cancel your request?',
    confirm: 'Cancel request',
    body: 'The supplier will be notified. If they had accepted your request, their reserved units will be released.',
    danger: true,
  },
  complete: {
    title: 'Confirm receipt of stock?',
    confirm: 'Confirm receipt',
    body: 'Only confirm after the medicine has physically arrived. The units will be removed from the supplier’s stock and added to yours. This action cannot be undone.',
  },
};

const STATUS_OPTIONS = [
  'PENDING',
  'ACCEPTED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

export default function TransferRequestsPage() {
  const toast = useToast();

  const [dir, setDir] = useState<Dir>('incoming');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [act, setAct] = useState<{
    row: TransferRequestRow;
    action: Action;
  } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [newRequestIds, setNewRequestIds] = useState<string[]>([]);

  const previousIncomingIds = useRef<Set<string> | null>(null);
  const previousPendingCount = useRef<number | null>(null);

  const summary = useApi<{
    incoming: Counts;
    outgoing: Counts;
  }>('/transfer-requests/summary');

  const list = useApi<{
    requests: TransferRequestRow[];
    pagination: Pg;
  }>('/transfer-requests', {
    direction: dir,
    status,
    page,
    pageSize: 10,
  });

  const counts = summary.data?.[dir];

  // Automatically refresh requests and counters every 15 seconds.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        summary.reload();
        list.reload();
      }
    }, 15000);

    return () => window.clearInterval(interval);
  }, [summary.reload, list.reload]);

  // Detect newly received incoming requests.
  useEffect(() => {
    if (dir !== 'incoming' || !list.data) return;

    const currentIds = new Set(
      list.data.requests.map((request) => request.id)
    );

    if (previousIncomingIds.current === null) {
      previousIncomingIds.current = currentIds;
      return;
    }

    const newIds = [...currentIds].filter(
      (id) => !previousIncomingIds.current!.has(id)
    );

    if (newIds.length > 0) {
      setNewRequestIds((previous) => [
        ...new Set([...previous, ...newIds]),
      ]);

      toast.success(
        `${newIds.length} new incoming request${newIds.length > 1 ? 's' : ''} received.`
      );
    }

    previousIncomingIds.current = currentIds;
  }, [dir, list.data, toast]);

  // Notify when the number of pending incoming requests increases.
  useEffect(() => {
    const pendingCount = summary.data?.incoming.PENDING;

    if (pendingCount === undefined) return;

    if (
      previousPendingCount.current !== null &&
      pendingCount > previousPendingCount.current
    ) {
      summary.reload();
      list.reload();
    }

    previousPendingCount.current = pendingCount;
  }, [summary.data, summary.reload, list.reload]);

  async function confirm() {
    if (!act) return;

    setBusy(true);

    try {
      await api(
        `/transfer-requests/${act.row.id}/${act.action}`,
        {
          method: 'POST',
          auth: true,
          body: { note },
        }
      );

      const messages: Record<Action, string> = {
        accept: 'Request accepted and stock reserved.',
        reject: 'Request rejected.',
        cancel: 'Request cancelled.',
        complete: 'Receipt confirmed. The stock is now in your inventory.',
      };

      toast.success(messages[act.action]);

      setAct(null);
      setNote('');
      summary.reload();
      list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function changeDirection(nextDir: Dir) {
    setDir(nextDir);
    setPage(1);
    setStatus('');
    setOpen(null);
    setNewRequestIds([]);
    previousIncomingIds.current = null;
    previousPendingCount.current = null;
  }

  const copy = act ? ACTION_COPY[act.action] : null;

  return (
    <div className="space-y-6 pb-8">
      {/* Page introduction */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Icon name="inbox" className="h-3.5 w-3.5" />
              Transfer management
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
              Transfer requests
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
              Manage stock requests between your pharmacy and other verified
              pharmacy partners. Track every request from acceptance to receipt.
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 px-4 py-3 sm:min-w-44">
            <p className="text-xs font-medium text-gray-500">
              Requests awaiting action
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-950">
              {counts ? counts.PENDING : '—'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {dir === 'incoming'
                ? 'Awaiting your response'
                : 'Awaiting supplier response'}
            </p>
          </div>
        </div>
      </section>

      {/* Direction selector */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => changeDirection('incoming')}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                dir === 'incoming'
                  ? 'bg-white text-gray-950 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Incoming
              {summary.data?.incoming.PENDING ? (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  {summary.data.incoming.PENDING}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => changeDirection('outgoing')}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                dir === 'outgoing'
                  ? 'bg-white text-gray-950 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Outgoing
              {summary.data?.outgoing.PENDING ? (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  {summary.data.outgoing.PENDING}
                </span>
              ) : null}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            {dir === 'incoming'
              ? 'Requests from pharmacies buying your stock'
              : 'Requests you have sent to other pharmacies'}
          </p>
        </div>

        {/* Request statistics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            {
              label: 'Total requests',
              value: counts?.total,
              icon: 'inbox' as const,
              bg: 'bg-gray-100',
              color: 'text-gray-700',
            },
            {
              label: 'Pending',
              value: counts?.PENDING,
              icon: 'alert' as const,
              bg: 'bg-amber-50',
              color: 'text-amber-700',
            },
            {
              label: 'Awaiting receipt',
              value: counts?.ACCEPTED,
              icon: 'repeat' as const,
              bg: 'bg-blue-50',
              color: 'text-blue-700',
            },
            {
              label: 'Completed',
              value: counts?.COMPLETED,
              icon: 'check' as const,
              bg: 'bg-emerald-50',
              color: 'text-emerald-700',
            },
            {
              label: 'Rejected / cancelled',
              value: counts
                ? counts.REJECTED + counts.CANCELLED
                : undefined,
              icon: 'x' as const,
              bg: 'bg-gray-100',
              color: 'text-gray-600',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bg} ${item.color}`}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium text-gray-500">
                  {item.label}
                </p>
              </div>
              <p className="mt-3 text-xl font-bold text-gray-950">
                {item.value ?? '—'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Request list */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-semibold text-gray-950">
              {dir === 'incoming' ? 'Incoming requests' : 'Outgoing requests'}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Review details and manage each transfer.
            </p>
            <p className="mt-1 text-[11px] text-emerald-700">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Automatically refreshes every 15 seconds
            </p>
          </div>

          <select
            aria-label="Filter requests by status"
            className="input w-full sm:w-48"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
              setOpen(null);
            }}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value[0] + value.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="border-b border-gray-100 bg-blue-50/60 px-4 py-3 sm:px-5">
          <div className="flex items-start gap-2">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
            <p className="text-xs leading-5 text-blue-900">
              Accepted requests mean stock has been reserved. Delivery and
              payment arrangements are handled directly between the pharmacies
              and are not tracked in PharmaCycle.
            </p>
          </div>
        </div>

        {list.loading && !list.data ? (
          <div className="p-5">
            <LoadingBlock />
          </div>
        ) : list.error ? (
          <div className="p-5">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        ) : !list.data?.requests.length ? (
          <div className="p-6">
            <EmptyState
              title={
                status
                  ? 'No requests with this status'
                  : 'No requests yet'
              }
              body={
                dir === 'incoming'
                  ? 'When another pharmacy requests your listed stock, the request will appear here.'
                  : 'Browse the Marketplace and request stock from another pharmacy. Your requests will appear here.'
              }
            />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {list.data.requests.map((request) => {
                const expanded = open === request.id;
                const isNew = newRequestIds.includes(request.id);

                return (
                  <li
                    key={request.id}
                    className={`p-4 transition sm:p-5 ${
                      isNew
                        ? 'bg-emerald-50/60'
                        : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-950">
                              {request.medicine.name}
                            </h3>
                            <span className="text-sm text-gray-500">
                              {request.medicine.strength}
                            </span>
                            {isNew && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                NEW
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-gray-600">
                            {request.quantity} units requested
                          </p>
                        </div>

                        <RequestBadge status={request.status} />
                      </div>

                      <div className="grid gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-600">
                            <Icon name="pharmacy" className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                              {dir === 'incoming' ? 'Requested by' : 'Supplier'}
                            </p>
                            <p className="truncate text-sm font-semibold text-gray-800">
                              {request.partner.name}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {[request.partner.city, request.partner.state]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-600">
                            <Icon name="package" className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                              Batch details
                            </p>
                            <p className="text-sm font-semibold text-gray-800">
                              {request.batchNumber}
                            </p>
                            <p className="text-xs text-gray-500">
                              Expires {formatDate(request.expiryDate)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                          <div>
                            <p className="text-[11px] text-gray-400">
                              Unit price
                            </p>
                            <p className="text-sm font-semibold text-gray-800">
                              {naira(request.unitPrice)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] text-gray-400">
                              Total value
                            </p>
                            <p className="text-sm font-bold text-gray-950">
                              {naira(request.total)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] text-gray-400">
                              Requested
                            </p>
                            <p className="text-sm font-medium text-gray-700">
                              {formatDateTime(request.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {request.partner.phone && (
                        <p className="text-xs text-gray-500">
                          <Icon name="phone" className="mr-1 inline h-3.5 w-3.5" />
                          {request.partner.phone}
                        </p>
                      )}

                      {request.message && (
                        <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                          <p className="text-[11px] font-medium text-gray-400">
                            Message from pharmacy
                          </p>
                          <p className="mt-1 text-sm italic text-gray-600">
                            “{request.message}”
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                        {dir === 'incoming' &&
                          request.status === 'PENDING' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                setAct({ row: request, action: 'accept' })
                              }
                            >
                              <Icon name="check" className="h-4 w-4" />
                              Accept request
                            </button>
                          )}

                        {dir === 'incoming' &&
                          (request.status === 'PENDING' ||
                            request.status === 'ACCEPTED') && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                setAct({ row: request, action: 'reject' })
                              }
                            >
                              Reject
                            </button>
                          )}

                        {dir === 'outgoing' &&
                          request.status === 'ACCEPTED' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                setAct({ row: request, action: 'complete' })
                              }
                            >
                              <Icon name="check" className="h-4 w-4" />
                              Confirm receipt
                            </button>
                          )}

                        {dir === 'outgoing' &&
                          (request.status === 'PENDING' ||
                            request.status === 'ACCEPTED') && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                setAct({ row: request, action: 'cancel' })
                              }
                            >
                              Cancel request
                            </button>
                          )}

                        <button
                          className="btn btn-ghost btn-sm ml-auto"
                          aria-expanded={expanded}
                          onClick={() =>
                            setOpen(expanded ? null : request.id)
                          }
                        >
                          <Icon name="clock" className="h-4 w-4" />
                          {expanded ? 'Hide history' : 'Activity history'}
                          <Icon
                            name="chevronDown"
                            className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>

                      {expanded && <History id={request.id} />}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-gray-100 px-4">
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

      {/* Confirmation modal */}
      <Modal
        open={!!act}
        title={copy?.title ?? ''}
        onClose={() => !busy && setAct(null)}
      >
        {act && copy && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">
                {act.row.quantity} × {act.row.medicine.name}{' '}
                {act.row.medicine.strength}
              </p>
              <p className="mt-2 text-sm leading-5 text-gray-600">
                {copy.body}
              </p>
            </div>

            <Field label="Note (optional)" htmlFor="a-note">
              <input
                id="a-note"
                className="input"
                maxLength={300}
                placeholder="Add a note..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => setAct(null)}
                disabled={busy}
              >
                Back
              </button>

              <button
                className={`btn ${copy.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={confirm}
                disabled={busy}
              >
                {busy ? 'Working…' : copy.confirm}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function History({ id }: { id: string }) {
  const {
    data,
    error,
    loading,
  } = useApi<{
    events: {
      id: string;
      type: string;
      actor: string;
      quantity: number;
      note: string | null;
      createdAt: string;
    }[];
  }>(`/transfer-requests/${id}/events`);

  if (loading) {
    return (
      <p className="mt-3 text-xs text-gray-500">
        Loading activity history…
      </p>
    );
  }

  if (error) {
    return (
      <p className="mt-3 text-xs text-red-700">
        {error}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Request activity
      </h4>

      {!data?.events.length ? (
        <p className="text-xs text-gray-500">
          No activity has been recorded yet.
        </p>
      ) : (
        <ol className="space-y-3 border-l-2 border-gray-200 pl-4 text-xs text-gray-600">
          {data.events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />

              <p>
                <span className="font-semibold text-gray-900">
                  {event.type[0] + event.type.slice(1).toLowerCase()}
                </span>{' '}
                by {event.actor}
              </p>

              <p className="mt-0.5 text-gray-500">
                {event.quantity} units · {formatDateTime(event.createdAt)}
              </p>

              {event.note && (
                <p className="mt-1 italic text-gray-500">
                  “{event.note}”
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
