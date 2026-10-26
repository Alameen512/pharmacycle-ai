'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, EmptyState, ErrorState, LoadingBlock, Pagination, StatCard } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { AlertRow, Pagination as Pg } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Resp = { alerts: AlertRow[]; summary: { total: number; unread: number; urgentUnread: number; transfer: number }; pagination: Pg };

export default function AlertsPage() {
  const toast = useToast();
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi<Resp>('/alerts', { unread: unreadOnly ? 'true' : undefined, page, pageSize: 20 });

  async function markRead(a: AlertRow) {
    try {
      if (!a.read) await api(`/alerts/${a.id}/read`, { method: 'PATCH', auth: true, body: {} });
      reload();
      window.dispatchEvent(new Event('pharmacycle:alerts-changed'));
      if (a.link) router.push(a.link);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function markAll() {
    try {
      await api('/alerts/read-all', { method: 'POST', auth: true, body: {} });
      reload();
      window.dispatchEvent(new Event('pharmacycle:alerts-changed'));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const s = data?.summary;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unread" value={s?.unread ?? '…'} icon="bell" tone="blue" />
        <StatCard label="Urgent (unread)" value={s?.urgentUnread ?? '…'} icon="alert" tone="red" />
        <StatCard label="All alerts" value={s?.total ?? '…'} icon="inbox" tone="gray" />
        <StatCard label="Transfer alerts" value={s?.transfer ?? '…'} icon="repeat" tone="blue" />
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} />Show unread only</label>
          <button className="btn btn-secondary btn-sm" onClick={markAll} disabled={!s?.unread}>Mark all as read</button>
        </div>
        {loading && !data ? <LoadingBlock /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.alerts.length ? (
          <EmptyState title={unreadOnly ? 'No unread alerts' : 'No alerts yet'} body="Expiry, low-stock and transfer notices appear here. Which ones you get is set in Settings." />
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {data.alerts.map((a) => (
                <li key={a.id}>
                  <button onClick={() => markRead(a)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-600">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.read ? 'bg-transparent' : a.severity === 'URGENT' ? 'bg-red-500' : a.severity === 'WARNING' ? 'bg-orange-400' : 'bg-blue-500'}`} aria-label={a.read ? 'Read' : 'Unread'} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${a.read ? 'text-gray-500' : 'font-medium text-gray-900'}`}>{a.message}</span>
                      <span className="mt-0.5 block text-xs text-gray-400">{formatDateTime(a.createdAt)}</span>
                    </span>
                    {a.severity === 'URGENT' && <Badge tone="red">Urgent</Badge>}
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 px-4"><Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPage={setPage} /></div>
          </>
        )}
      </div>
    </div>
  );
}
