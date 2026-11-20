
'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  DonutChart,
  EmptyState,
  ErrorState,
  Icon,
  LoadingBlock,
  PageCard,
  StatCard,
} from '@/components/ui';
import { RequestModal } from '@/components/RequestModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  expiryNote,
  formatDateTime,
  naira,
  STOCK_META,
} from '@/lib/format';
import type {
  AlertRow,
  Insight,
  InventoryStatus,
  Listing,
} from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Summary = {
  inventoryRecords: number;
  nearExpiryRecords: number;
  activeListings: number;
  partners: number;
  statusBreakdown: Record<InventoryStatus, number>;
};

const INSIGHT_LABEL: Record<string, string> = {
  EXPIRY_RISK: 'Expiry risk',
  DEMAND_FORECAST: 'Demand forecast',
  RESTOCK_SUGGESTION: 'Restock',
};

export default function DashboardPage() {
  const { session } = useAuth();
  const toast = useToast();

  const summary = useApi<Summary>('/dashboard/summary');
  const insights = useApi<{
    insights: Record<string, Insight | null>;
    configured: boolean;
  }>('/insights');
  const listings = useApi<{ listings: Listing[] }>(
    '/transfers/available',
    { pageSize: 4 }
  );
  const alerts = useApi<{ alerts: AlertRow[] }>('/alerts', {
    pageSize: 4,
  });

  const [target, setTarget] = useState<Listing | null>(null);

  const s = summary.data;

  const latest = insights.data
    ? Object.values(insights.data.insights).filter(
        (x): x is Insight => !!x
      )
    : [];

  const canRequest =
    session?.kind === 'pharmacy' &&
    session.pharmacy.verificationStatus === 'VERIFIED';

  const needsAttention =
    (alerts.data?.alerts.length ?? 0) > 0 || latest.length > 0;

  return (
    <div className="space-y-7">

      {/* Welcome and primary actions */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-700 p-6 text-white sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-2 text-sm font-medium text-white/75">
            YOUR PHARMACY WORKSPACE
          </p>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Good to see you,{' '}
            {session?.kind === 'pharmacy'
              ? session.pharmacy.name
              : 'Pharmacy'}
          </h1>

          <p className="mt-2 max-w-lg text-sm leading-6 text-white/80">
            Manage your stock, discover medicines from other pharmacies
            and stay ahead of inventory risks.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/inventory?add=1"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-gray-100"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add medicine
            </Link>

            <Link
              href="/scan"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Icon name="camera" className="h-4 w-4" />
              Scan medicine
            </Link>

            <Link
              href="/transfers"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Icon name="search" className="h-4 w-4" />
              Find stock
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-10 h-44 w-44 rounded-full border border-white/10" />
      </section>

      {/* Business overview */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Your overview
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              A quick look at your pharmacy.
            </p>
          </div>

          <Link
            href="/analysis"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            View analysis
          </Link>
        </div>

        {summary.error ? (
          <div className="card">
            <ErrorState
              message={summary.error}
              onRetry={summary.reload}
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Inventory items"
              value={
                summary.loading
                  ? '…'
                  : s?.inventoryRecords ?? 0
              }
              icon="package"
              tone="green"
              href="/inventory"
            />

            <StatCard
              label="Near expiry"
              value={
                summary.loading
                  ? '…'
                  : s?.nearExpiryRecords ?? 0
              }
              icon="alert"
              tone="orange"
              href="/inventory?status=NEAR_EXPIRY"
            />

            <StatCard
              label="Active listings"
              value={
                summary.loading
                  ? '…'
                  : s?.activeListings ?? 0
              }
              icon="repeat"
              tone="blue"
              href="/transfers?tab=mine"
            />

            <StatCard
              label="Partner pharmacies"
              value={
                summary.loading
                  ? '…'
                  : s?.partners ?? 0
              }
              icon="users"
              tone="purple"
              href="/pharmacies"
            />
          </div>
        )}
      </section>

      {/* Marketplace */}
      <section>
        <PageCard
          title="Marketplace"
          action={
            <Link
              href="/transfers"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Explore marketplace
            </Link>
          }
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-500">
              Discover available medicines listed by partner pharmacies.
            </p>
          </div>

          {listings.loading ? (
            <LoadingBlock />
          ) : listings.error ? (
            <ErrorState
              message={listings.error}
              onRetry={listings.reload}
            />
          ) : !listings.data?.listings.length ? (
            <EmptyState
              title="No available listings"
              body="New medicines listed by verified pharmacies will appear here."
              action={
                <Link
                  href="/transfers"
                  className="btn btn-primary btn-sm"
                >
                  Visit marketplace
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {listings.data.listings.slice(0, 4).map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">
                      {l.medicine.name} {l.medicine.strength}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {l.pharmacy?.name} · {l.remaining} units
                    </p>

                    <p className="mt-1 text-sm font-semibold text-brand-700">
                      {naira(l.unitPrice)}
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {expiryNote(l.daysToExpiry)}
                      </span>
                    </p>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm shrink-0"
                    onClick={() => setTarget(l)}
                    disabled={!canRequest}
                    title={
                      !canRequest
                        ? 'Pharmacy verification is required'
                        : 'Request this medicine'
                    }
                  >
                    Request stock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PageCard>
      </section>

      {/* Inventory and attention */}
      <div className="grid gap-6 lg:grid-cols-2">

        <PageCard
          title="Inventory health"
          action={
            <Link
              href="/inventory"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Manage inventory
            </Link>
          }
        >
          {summary.loading ? (
            <LoadingBlock />
          ) : summary.error ? (
            <ErrorState
              message={summary.error}
              onRetry={summary.reload}
            />
          ) : s && s.inventoryRecords > 0 ? (
            <div className="flex flex-col items-center gap-5 p-5">
              <DonutChart
                centerLabel="items"
                segments={(
                  Object.keys(STOCK_META) as InventoryStatus[]
                ).map((k) => ({
                  label: STOCK_META[k].label,
                  value: s.statusBreakdown[k],
                  color: STOCK_META[k].color,
                }))}
              />

              <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {(Object.keys(STOCK_META) as InventoryStatus[]).map(
                  (k) => (
                    <li
                      key={k}
                      className="flex items-center gap-2 text-gray-600"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          background: STOCK_META[k].color,
                        }}
                      />
                      <span>{STOCK_META[k].label}</span>
                      <span className="ml-auto font-semibold text-gray-900">
                        {s.statusBreakdown[k]}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>
          ) : (
            <EmptyState
              title="No inventory yet"
              body="Add your first medicine to start monitoring your stock."
              action={
                <Link
                  href="/inventory?add=1"
                  className="btn btn-primary btn-sm"
                >
                  Add medicine
                </Link>
              }
            />
          )}
        </PageCard>

        <PageCard
          title="Needs attention"
          action={
            <Link
              href="/alerts"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              View all alerts
            </Link>
          }
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-500">
              Important updates and recommendations for your pharmacy.
            </p>
          </div>

          {alerts.loading || insights.loading ? (
            <LoadingBlock />
          ) : alerts.error ? (
            <ErrorState
              message={alerts.error}
              onRetry={alerts.reload}
            />
          ) : insights.error ? (
            <ErrorState
              message={insights.error}
              onRetry={insights.reload}
            />
          ) : !needsAttention ? (
            <EmptyState
              title="You're all caught up"
              body="Inventory alerts and AI recommendations will appear here when available."
            />
          ) : (
            <div className="divide-y divide-gray-100">

              {alerts.data?.alerts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-4"
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      a.severity === 'URGENT'
                        ? 'bg-red-500'
                        : a.severity === 'WARNING'
                          ? 'bg-orange-400'
                          : 'bg-blue-400'
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        a.read
                          ? 'text-gray-500'
                          : 'font-semibold text-gray-900'
                      }`}
                    >
                      {a.message}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {formatDateTime(a.createdAt)}
                    </p>
                  </div>

                  {!a.read && (
                    <Badge tone="blue">New</Badge>
                  )}
                </div>
              ))}

              {latest.slice(0, 3).map((i) => (
                <div key={i.id} className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone="purple">
                      {INSIGHT_LABEL[i.type] ?? i.type}
                    </Badge>

                    <span className="text-xs text-gray-400">
                      {formatDateTime(i.generatedAt)}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-gray-700">
                    {i.payload.summary}
                  </p>
                </div>
              ))}

              <div className="p-4">
                <Link
                  href="/ai-insights"
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  Explore AI recommendations →
                </Link>
              </div>
            </div>
          )}
        </PageCard>
      </div>

      <RequestModal
        listing={target}
        onClose={() => setTarget(null)}
        onDone={() => {
          setTarget(null);
          toast.success(
            'Request sent. The supplier has been notified in the app.'
          );
          listings.reload();
        }}
      />
    </div>
  );
}
