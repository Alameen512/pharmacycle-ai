
'use client';

import {
  EmptyState,
  ErrorState,
  Icon,
  LoadingBlock,
  PageCard,
  StatCard,
} from '@/components/ui';
import { formatDate, num } from '@/lib/format';
import { useApi } from '@/lib/useApi';

type Counts = Record<
  'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED',
  number
>;

type Summary = {
  window: { days: number; from: string; to: string };
  categories: { category: string; records: number; units: number }[];
  transfers: {
    incoming: Counts;
    outgoing: Counts;
    completed: number;
  };
  atRiskUnits: number;
  partners: number;
  sales: {
    recordCount: number;
    unitsSold: number;
    unitsOnHand: number;
    salesToStockRatio: number | null;
  };
};

const STAGES: [string, keyof Counts, string][] = [
  ['Pending', 'PENDING', '#f59e0b'],
  ['Accepted, awaiting receipt', 'ACCEPTED', '#2563eb'],
  ['Completed', 'COMPLETED', '#16a34a'],
  ['Rejected', 'REJECTED', '#dc2626'],
  ['Cancelled', 'CANCELLED', '#9ca3af'],
];

function Bars({
  rows,
}: {
  rows: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="min-w-0 text-sm text-gray-600">
              {row.label}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
              {num(row.value)}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(row.value / max) * 100}%`,
                background: row.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AnalysisPage() {
  const { data, error, loading, reload } = useApi<Summary>(
    '/analytics/summary'
  );

  if (loading && !data) return <LoadingBlock />;

  if (error || !data) {
    return (
      <div className="card">
        <ErrorState
          message={error || 'No analytics data available.'}
          onRetry={reload}
        />
      </div>
    );
  }

  const { sales, transfers } = data;

  const totalIncoming = Object.values(transfers.incoming).reduce(
    (sum, value) => sum + value,
    0
  );

  const totalOutgoing = Object.values(transfers.outgoing).reduce(
    (sum, value) => sum + value,
    0
  );

  const totalCategoryUnits = data.categories.reduce(
    (sum, category) => sum + category.units,
    0
  );

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="mb-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            Business performance
          </span>

          <h1 className="text-2xl font-bold tracking-tight text-gray-950">
            Analytics & Analysis
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Understand your stock, sales activity and pharmacy transfers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-gray-100 bg-white px-3 py-2.5 sm:self-center">
          <Icon name="chart" className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-xs font-medium text-gray-800">
              Reporting period
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(data.window.from)} – {formatDate(data.window.to)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Performance overview
          </h2>
          <span className="text-xs text-gray-400">
            Based on available records
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Sales-to-stock ratio"
            value={sales.salesToStockRatio ?? 'n/a'}
            icon="chart"
            tone="green"
            hint={
              sales.salesToStockRatio === null
                ? 'Needs recorded sales and stock'
                : `${num(sales.unitsSold)} sold ÷ ${num(sales.unitsOnHand)} on hand`
            }
          />

          <StatCard
            label="Completed transfers"
            value={transfers.completed}
            icon="repeat"
            tone="blue"
            hint="Both directions, all time"
          />

          <StatCard
            label="At-risk units"
            value={num(data.atRiskUnits)}
            icon="alert"
            tone="orange"
            hint="Near-expiry and expired units"
          />

          <StatCard
            label="Verified partners"
            value={data.partners}
            icon="users"
            tone="purple"
            hint="Verified pharmacy network"
          />
        </div>
      </section>

      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
            <Icon name="chart" className="h-4 w-4" />
          </span>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              Understanding your sales-to-stock ratio
            </p>

            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              This is units sold during the last {data.window.days} days
              divided by usable units currently on hand. It is a rough
              performance guide, not accounting inventory turnover.
              It only includes sales recorded in PharmaCycle.AI.
            </p>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
              <span className="text-gray-600">
                <strong className="text-gray-900">
                  {num(sales.unitsSold)}
                </strong>{' '}
                units sold
              </span>

              <span className="text-gray-600">
                <strong className="text-gray-900">
                  {num(sales.unitsOnHand)}
                </strong>{' '}
                units on hand
              </span>

              <span className="text-gray-600">
                <strong className="text-gray-900">
                  {sales.recordCount}
                </strong>{' '}
                sales records
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="grid min-w-0 gap-5 xl:grid-cols-2">
        <PageCard
          title="Inventory by category"
          action={
            <span className="text-xs text-gray-400">
              {num(totalCategoryUnits)} units
            </span>
          }
        >
          <div className="p-5">
            {data.categories.length ? (
              <>
                <p className="mb-5 text-xs text-gray-500">
                  Distribution of your recorded stock across medicine
                  categories.
                </p>

                <Bars
                  rows={data.categories.slice(0, 8).map((category) => ({
                    label: `${category.category} (${category.records} records)`,
                    value: category.units,
                    color: '#16a34a',
                  }))}
                />

                {data.categories.length > 8 && (
                  <p className="mt-4 text-xs text-gray-400">
                    Showing the top 8 categories.
                  </p>
                )}
              </>
            ) : (
              <EmptyState
                title="No inventory yet"
                body="Add inventory to start seeing category analysis."
              />
            )}
          </div>
        </PageCard>

        <PageCard
          title="Transfer pipeline"
          action={
            <span className="text-xs text-gray-400">
              {num(totalIncoming + totalOutgoing)} requests
            </span>
          }
        >
          <div className="space-y-7 p-5">
            {(
              [
                {
                  key: 'incoming',
                  title: 'Incoming requests',
                  subtitle: 'Requests from pharmacies that want your stock',
                  counts: transfers.incoming,
                  total: totalIncoming,
                },
                {
                  key: 'outgoing',
                  title: 'Outgoing requests',
                  subtitle: 'Requests you have made to other pharmacies',
                  counts: transfers.outgoing,
                  total: totalOutgoing,
                },
              ] as const
            ).map((direction) => (
              <div key={direction.key}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {direction.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                      {direction.subtitle}
                    </p>
                  </div>

                  <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-gray-800">
                    {direction.total}
                  </span>
                </div>

                {direction.total > 0 ? (
                  <Bars
                    rows={STAGES.map(([label, key, color]) => ({
                      label,
                      value: direction.counts[key],
                      color,
                    }))}
                  />
                ) : (
                  <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">
                    No transfer requests yet.
                  </p>
                )}
              </div>
            ))}
          </div>
        </PageCard>
      </section>

      <p className="text-xs leading-relaxed text-gray-400">
        Analytics are generated from records currently available in your
        PharmaCycle.AI account. Sales metrics use the reporting period
        shown above, while completed transfers and verified partners
        follow their respective all-time counts.
      </p>
    </div>
  );
}
