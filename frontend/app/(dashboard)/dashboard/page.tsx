'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, DonutChart, EmptyState, ErrorState, Icon, LoadingBlock, PageCard, StatCard } from '@/components/ui';
import { RequestModal } from '@/components/RequestModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { expiryNote, formatDateTime, naira, STOCK_META } from '@/lib/format';
import type { AlertRow, Insight, InventoryStatus, Listing } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Summary = { inventoryRecords: number; nearExpiryRecords: number; activeListings: number; partners: number; statusBreakdown: Record<InventoryStatus, number> };
const INSIGHT_LABEL: Record<string, string> = { EXPIRY_RISK: 'Expiry risk', DEMAND_FORECAST: 'Demand forecast', RESTOCK_SUGGESTION: 'Restock' };

export default function DashboardPage() {
  const { session } = useAuth();
  const toast = useToast();
  const summary = useApi<Summary>('/dashboard/summary');
  const insights = useApi<{ insights: Record<string, Insight | null>; configured: boolean }>('/insights');
  const listings = useApi<{ listings: Listing[] }>('/transfers/available', { pageSize: 4 });
  const alerts = useApi<{ alerts: AlertRow[] }>('/alerts', { pageSize: 4 });
  const [target, setTarget] = useState<Listing | null>(null);

  const s = summary.data;
  const latest = insights.data ? Object.values(insights.data.insights).filter((x): x is Insight => !!x) : [];

  return (
    <div className="space-y-6">
      <p className="mb-5 text-sm text-gray-500">Here&apos;s what&apos;s happening with your inventory today.</p>

      {summary.error ? <div className="card"><ErrorState message={summary.error} onRetry={summary.reload} /></div> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Inventory Items" value={summary.loading ? '…' : s?.inventoryRecords ?? 0} icon="package" tone="green" href="/inventory" />
          <StatCard label="Near Expiry Items" value={summary.loading ? '…' : s?.nearExpiryRecords ?? 0} icon="alert" tone="orange" href="/inventory?status=NEAR_EXPIRY" />
          <StatCard label="Active Transfers" value={summary.loading ? '…' : s?.activeListings ?? 0} icon="repeat" tone="blue" href="/transfers?tab=mine" />
          <StatCard label="Available Pharmacies" value={summary.loading ? '…' : s?.partners ?? 0} icon="users" tone="purple" href="/pharmacies" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2 md:grid-cols-2">
          <PageCard title="Inventory Status Overview">
            {summary.loading ? <LoadingBlock /> : s && s.inventoryRecords > 0 ? (
              <div className="flex flex-col items-center gap-4 p-5">
                <DonutChart centerLabel="items" segments={(Object.keys(STOCK_META) as InventoryStatus[]).map((k) => ({ label: STOCK_META[k].label, value: s.statusBreakdown[k], color: STOCK_META[k].color }))} />
                <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {(Object.keys(STOCK_META) as InventoryStatus[]).map((k) => <li key={k} className="flex items-center gap-2 text-gray-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STOCK_META[k].color }} />{STOCK_META[k].label}<span className="ml-auto font-medium text-gray-900">{s.statusBreakdown[k]}</span></li>)}
                </ul>
              </div>
            ) : <EmptyState title="No inventory yet" body="Add your first medicine to see its status here." action={<Link href="/inventory?add=1" className="btn btn-primary btn-sm">Add medicine</Link>} />}
          </PageCard>

          <PageCard title="AI Insights" action={<Link href="/ai-insights" className="text-sm font-medium text-brand-700 hover:underline">See all</Link>}>
            {insights.loading ? <LoadingBlock /> : insights.error ? <ErrorState message={insights.error} onRetry={insights.reload} /> : latest.length === 0 ? (
              <EmptyState title="No insights generated yet" body={insights.data?.configured ? 'Generate your first insight from the AI Insights page.' : 'AI insights are not configured on this server, so none can be generated.'} />
            ) : <ul className="divide-y divide-gray-100">{latest.slice(0, 3).map((i) => <li key={i.id} className="p-4"><div className="mb-1 flex flex-wrap items-center gap-2"><Badge tone="purple">{INSIGHT_LABEL[i.type] ?? i.type}</Badge><span className="text-xs text-gray-400">{formatDateTime(i.generatedAt)}</span></div><p className="line-clamp-3 text-sm text-gray-700">{i.payload.summary}</p></li>)}</ul>}
          </PageCard>
        </div>

        <PageCard title="Available Medicines for Transfer" className="min-w-0" action={<Link href="/transfers" className="text-sm font-medium text-brand-700 hover:underline">See all</Link>}>
          {listings.loading ? <LoadingBlock /> : listings.error ? <ErrorState message={listings.error} onRetry={listings.reload} /> : !listings.data?.listings.length ? (
            <EmptyState title="Nothing listed right now" body="When verified partners list surplus stock, it shows up here." />
          ) : <ul className="divide-y divide-gray-100">{listings.data.listings.slice(0, 5).map((l) => <li key={l.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-sm font-medium text-gray-900">{l.medicine.name} {l.medicine.strength}</p><p className="truncate text-xs text-gray-500">{l.pharmacy?.name} · {l.remaining} units · {naira(l.unitPrice)} · {expiryNote(l.daysToExpiry)}</p></div><button className="btn btn-secondary btn-sm shrink-0" onClick={() => setTarget(l)} disabled={session?.kind === 'pharmacy' && session.pharmacy.verificationStatus !== 'VERIFIED'}>Request</button></li>)}</ul>}
        </PageCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PageCard title="Alerts" action={<Link href="/alerts" className="text-sm font-medium text-brand-700 hover:underline">See all</Link>}>
          {alerts.loading ? <LoadingBlock /> : alerts.error ? <ErrorState message={alerts.error} onRetry={alerts.reload} /> : !alerts.data?.alerts.length ? (
            <EmptyState title="No alerts" body="Expiry, stock and transfer notices will appear here." />
          ) : <ul className="divide-y divide-gray-100">{alerts.data.alerts.map((a) => <li key={a.id} className="flex items-start gap-3 p-4"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.severity === 'URGENT' ? 'bg-red-500' : a.severity === 'WARNING' ? 'bg-orange-400' : 'bg-blue-400'}`} /><div><p className={`text-sm ${a.read ? 'text-gray-500' : 'font-medium text-gray-900'}`}>{a.message}</p><p className="text-xs text-gray-400">{formatDateTime(a.createdAt)}</p></div></li>)}</ul>}
        </PageCard>

        <PageCard title="Quick Actions">
          <div className="grid grid-cols-2 gap-2.5 p-5">
            {[
              { href: '/scan', label: 'Scan Medicine', icon: 'camera' as const },
              { href: '/transfers?tab=mine&new=1', label: 'List for Transfer', icon: 'repeat' as const },
              { href: '/transfers', label: 'Search Medicines', icon: 'search' as const },
              { href: '/transfer-requests', label: 'Transfer Requests', icon: 'inbox' as const },
            ].map((a) => <Link key={a.href} href={a.href} className="flex items-center gap-2 rounded-xl border border-gray-100 p-3 text-xs font-medium text-gray-700 transition-all hover:border-gray-200 hover:bg-gray-50"><Icon name={a.icon} className="h-4 w-4 shrink-0 text-brand-600" />{a.label}</Link>)}
          </div>
        </PageCard>
      </div>

      <RequestModal listing={target} onClose={() => setTarget(null)} onDone={() => { setTarget(null); toast.success('Request sent. The supplier has been notified in the app.'); listings.reload(); }} />
    </div>
  );
}
