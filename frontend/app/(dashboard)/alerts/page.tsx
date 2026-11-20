
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Badge,
  EmptyState,
  ErrorState,
  Icon,
  LoadingBlock,
  Pagination,
  StatCard,
  Spinner,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { AlertRow, Pagination as Pg } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Resp = {
  alerts: AlertRow[];
  summary: {
    total: number;
    unread: number;
    urgentUnread: number;
    transfer: number;
  };
  pagination: Pg;
};

export default function AlertsPage() {
  const toast = useToast();
  const router = useRouter();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState('');

  const { data, error, loading, reload } = useApi<Resp>('/alerts', {
    unread: unreadOnly ? 'true' : undefined,
    page,
    pageSize: 20,
  });

  async function markRead(alert: AlertRow) {
    setMarkingId(alert.id);

    try {
      if (!alert.read) {
        await api(`/alerts/${alert.id}/read`, {
          method: 'PATCH',
          auth: true,
          body: {},
        });
      }

      reload();
      window.dispatchEvent(new Event('pharmacycle:alerts-changed'));

      if (alert.link) {
        router.push(alert.link);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setMarkingId('');
    }
  }

  async function markAll() {
    setMarkingAll(true);

    try {
      await api('/alerts/read-all', {
        method: 'POST',
        auth: true,
        body: {},
      });

      toast.success('All alerts marked as read.');
      reload();
      window.dispatchEvent(new Event('pharmacycle:alerts-changed'));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setMarkingAll(false);
    }
  }

  const summary = data?.summary;

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      {/* Introduction */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="mb-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            Notification centre
          </span>

          <h1 className="text-2xl font-bold tracking-tight text-gray-950">
            Alerts & Notifications
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Keep track of stock warnings, expiry notices and transfer updates.
          </p>
        </div>

        {summary && summary.unread > 0 && (
          <div className="flex items-center gap-2 self-start rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
            <Icon name="bell" className="h-4 w-4 text-blue-700" />
            <span className="text-sm font-semibold text-blue-800">
              {summary.unread} unread
            </span>
          </div>
        )}
      </section>

      {/* Overview */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Notification overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Unread"
            value={summary?.unread ?? '…'}
            icon="bell"
            tone="blue"
            hint="Awaiting your attention"
          />

          <StatCard
            label="Urgent unread"
            value={summary?.urgentUnread ?? '…'}
            icon="alert"
            tone="red"
            hint="Requires priority attention"
          />

          <StatCard
            label="All alerts"
            value={summary?.total ?? '…'}
            icon="inbox"
            tone="gray"
            hint="All recorded notifications"
          />

          <StatCard
            label="Transfer alerts"
            value={summary?.transfer ?? '…'}
            icon="repeat"
            tone="blue"
            hint="Transfer-related notifications"
          />
        </div>
      </section>

      {/* Notification list */}
      <section className="card min-w-0 overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Your notifications
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Select a notification to view its related activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={unreadOnly}
                onChange={(event) => {
                  setUnreadOnly(event.target.checked);
                  setPage(1);
                }}
              />
              Unread only
            </label>

            <button
              className="btn btn-secondary btn-sm"
              onClick={markAll}
              disabled={!summary?.unread || markingAll}
            >
              {markingAll ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Icon name="check" className="h-3.5 w-3.5" />
              )}
              Mark all as read
            </button>
          </div>
        </div>

        {loading && !data ? (
          <LoadingBlock />
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : !data?.alerts.length ? (
          <div className="p-6">
            <EmptyState
              title={unreadOnly ? 'You are all caught up' : 'No notifications yet'}
              body={
                unreadOnly
                  ? 'There are no unread notifications waiting for you.'
                  : 'Expiry, low-stock and transfer notifications will appear here. Your notification preferences are managed in Settings.'
              }
            />
          </div>
        ) : (
          <>
            <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-3">
              <p className="text-xs font-medium text-gray-500">
                {unreadOnly ? 'Showing unread notifications' : 'Recent activity'}
                {' · '}
                {data.pagination.total} result
                {data.pagination.total === 1 ? '' : 's'}
              </p>
            </div>

            <ul className="divide-y divide-gray-100">
              {data.alerts.map((alert) => {
                const urgent = alert.severity === 'URGENT';
                const warning = alert.severity === 'WARNING';

                return (
                  <li key={alert.id}>
                    <button
                      type="button"
                      onClick={() => markRead(alert)}
                      disabled={markingId === alert.id}
                      className={`group flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-600 ${
                        !alert.read ? 'bg-blue-50/30' : 'bg-white'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          urgent
                            ? 'bg-red-50 text-red-600'
                            : warning
                              ? 'bg-orange-50 text-orange-600'
                              : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {urgent ? (
                          <Icon name="alert" className="h-5 w-5" />
                        ) : warning ? (
                          <Icon name="warningCircle" className="h-5 w-5" />
                        ) : (
                          <Icon name="bell" className="h-5 w-5" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm ${
                              alert.read
                                ? 'font-medium text-gray-600'
                                : 'font-semibold text-gray-950'
                            }`}
                          >
                            {alert.message}
                          </span>

                          {!alert.read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                          )}
                        </span>

                        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          <span>{formatDateTime(alert.createdAt)}</span>
                          <span>·</span>
                          <span>
                            {alert.read ? 'Read' : 'Unread'}
                          </span>
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-2">
                        {urgent && (
                          <Badge tone="red">Urgent</Badge>
                        )}

                        {warning && (
                          <Badge tone="orange">Warning</Badge>
                        )}

                        {markingId === alert.id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <Icon
                            name="chevronDown"
                            className="h-4 w-4 -rotate-90 text-gray-300 transition group-hover:text-gray-500"
                          />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-gray-100 px-4">
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
