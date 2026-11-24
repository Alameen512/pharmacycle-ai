
'use client';

import { useState } from 'react';
import {
  EmptyState,
  ErrorState,
  Field,
  Icon,
  LoadingBlock,
  PageCard,
  Spinner,
  StatCard,
} from '@/components/ui';
import { downloadCsv, errorMessage } from '@/lib/api';
import { formatDate, num, STOCK_META } from '@/lib/format';
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
    daily: { date: string; unitsSold: number }[];
    monthly: { month: string; unitsSold: number }[];
  };
};

type ExportResult = {
  ok: boolean;
  text: string;
};

type ExportKey = 'inventory' | 'transfers' | 'sales';

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

  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState('');
  const [salesView, setSalesView] = useState<'daily' | 'monthly'>('daily');
  const [results, setResults] = useState<
    Record<string, ExportResult>
  >({});

  async function runExport(key: ExportKey) {
    setBusy(key);

    setResults((current) => ({
      ...current,
      [key]: { ok: true, text: '' },
    }));

    try {
      let output;

      if (key === 'inventory') {
        output = await downloadCsv('/reports/inventory.csv', { status });
      } else if (key === 'transfers') {
        output = await downloadCsv('/reports/transfers.csv', { from, to });
      } else {
        output = await downloadCsv('/reports/sales.csv', { from, to });
      }

      setResults((current) => ({
        ...current,
        [key]: {
          ok: true,
          text: `Downloaded ${output.filename} with ${output.rows} row${output.rows === 1 ? '' : 's'}.`,
        },
      }));
    } catch (err) {
      setResults((current) => ({
        ...current,
        [key]: {
          ok: false,
          text: errorMessage(err),
        },
      }));
    } finally {
      setBusy('');
    }
  }

  function exportNotice(key: string) {
    const result = results[key];

    if (!result?.text) return null;

    return (
      <div
        role={result.ok ? 'status' : 'alert'}
        className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
          result.ok
            ? 'bg-green-50 text-green-800'
            : 'bg-red-50 text-red-700'
        }`}
      >
        <Icon
          name={result.ok ? 'checkCircle' : 'warningCircle'}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <p>{result.text}</p>
      </div>
    );
  }

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

  const invalidDates = !!from && !!to && from > to;

  const salesRows =
    salesView === 'daily'
      ? sales.daily.slice(-14).map((item) => ({
          label: formatDate(item.date),
          value: item.unitsSold,
          color: '#16a34a',
        }))
      : sales.monthly.map((item) => ({
          label: item.month,
          value: item.unitsSold,
          color: '#2563eb',
        }));

  const salesTotal = salesRows.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      {/* Page introduction */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="mb-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            Business performance
          </span>

          <h1 className="text-2xl font-bold tracking-tight text-gray-950">
            Reports & Analytics
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Understand your stock, sales activity, pharmacy transfers and
            business performance.
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

      {/* Performance overview */}
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

      {/* Sales-to-stock explanation */}
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

      {/* Daily and monthly sales analytics */}
      <PageCard
        title="Sales activity"
        action={
          <span className="text-xs text-gray-400">
            {num(sales.unitsSold)} units in {data.window.days} days
          </span>
        }
      >
        <div className="space-y-5 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Units sold over time
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Track recorded sales activity by day or month.
              </p>
            </div>

            <div className="inline-flex w-fit rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setSalesView('daily')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  salesView === 'daily'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Daily
              </button>

              <button
                type="button"
                onClick={() => setSalesView('monthly')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  salesView === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-green-50/70 p-4">
              <p className="text-xs font-medium text-green-700">
                Total units sold
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-950">
                {num(sales.unitsSold)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Across the reporting period
              </p>
            </div>

            <div className="rounded-xl bg-blue-50/70 p-4">
              <p className="text-xs font-medium text-blue-700">
                Sales records
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-950">
                {num(sales.recordCount)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Individual recorded sales entries
              </p>
            </div>
          </div>

          {salesRows.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-gray-500">
                  {salesView === 'daily'
                    ? 'Daily breakdown (latest 14 days)'
                    : 'Monthly breakdown'}
                </p>
                <p className="text-sm font-semibold tabular-nums text-gray-900">
                  {num(salesTotal)} units
                </p>
              </div>

              <Bars rows={salesRows} />
            </>
          ) : (
            <EmptyState
              title="No sales recorded yet"
              body="Record sales from your inventory to see daily and monthly sales activity here."
            />
          )}

          <p className="text-xs leading-relaxed text-gray-400">
            This report tracks quantities sold, not sales revenue. Revenue
            cannot currently be calculated because sale prices are not stored
            in sales records.
          </p>
        </div>
      </PageCard>

      {/* Inventory and transfer analytics */}
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

      {/* Export centre */}
      <section className="space-y-4">
        <div>
          <span className="mb-2 inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            Data & exports
          </span>

          <h2 className="text-xl font-bold text-gray-900">
            Export centre
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Download your pharmacy records for bookkeeping, analysis and
            business reporting.
          </p>
        </div>

        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          {/* Inventory export */}
          <PageCard title="Inventory report">
            <div className="space-y-5 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <Icon name="package" className="h-5 w-5" />
                </span>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Export inventory records
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Download your medicine records, batches, quantities
                    and prices.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs leading-relaxed text-gray-600">
                  Includes every matching inventory record, not just the
                  current page. Prices are in naira, and NAFDAC numbers
                  are exported as entered.
                </p>
              </div>

              <Field label="Filter by stock status" htmlFor="rp-status">
                <select
                  id="rp-status"
                  className="input"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">All statuses</option>
                  {Object.entries(STOCK_META).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </Field>

              <button
                className="btn btn-primary w-full"
                onClick={() => runExport('inventory')}
                disabled={!!busy}
              >
                {busy === 'inventory' ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Icon name="download" className="h-4 w-4" />
                )}
                {busy === 'inventory'
                  ? 'Preparing report…'
                  : 'Download inventory CSV'}
              </button>

              {exportNotice('inventory')}
            </div>
          </PageCard>

          {/* Transfer export */}
          <PageCard title="Transfer report">
            <div className="space-y-5 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Icon name="repeat" className="h-5 w-5" />
                </span>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Export transfer records
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Download incoming and outgoing pharmacy transfer
                    requests.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs leading-relaxed text-gray-600">
                  Filter requests by the date they were made. Leave both
                  dates empty to export all available transfer records.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="From date" htmlFor="rp-from">
                  <input
                    id="rp-from"
                    type="date"
                    className="input"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    max={to || undefined}
                  />
                </Field>

                <Field label="To date (inclusive)" htmlFor="rp-to">
                  <input
                    id="rp-to"
                    type="date"
                    className="input"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    min={from || undefined}
                  />
                </Field>
              </div>

              {invalidDates && (
                <p className="text-sm text-red-700">
                  The start date must be on or before the end date.
                </p>
              )}

              <button
                className="btn btn-primary w-full"
                onClick={() => runExport('transfers')}
                disabled={!!busy || invalidDates}
              >
                {busy === 'transfers' ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Icon name="download" className="h-4 w-4" />
                )}
                {busy === 'transfers'
                  ? 'Preparing report…'
                  : 'Download transfers CSV'}
              </button>

              {exportNotice('transfers')}
            </div>
          </PageCard>

          {/* Sales export */}
          <PageCard title="Sales report">
            <div className="space-y-5 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                  <Icon name="chart" className="h-5 w-5" />
                </span>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Export sales records
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Download recorded medicine sales and quantities sold.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs leading-relaxed text-gray-600">
                  Includes medicine details, units sold, sale dates and
                  record timestamps. Sales are filtered by the selected
                  date range.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="From date" htmlFor="sales-from">
                  <input
                    id="sales-from"
                    type="date"
                    className="input"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    max={to || undefined}
                  />
                </Field>

                <Field label="To date (inclusive)" htmlFor="sales-to">
                  <input
                    id="sales-to"
                    type="date"
                    className="input"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    min={from || undefined}
                  />
                </Field>
              </div>

              {invalidDates && (
                <p className="text-sm text-red-700">
                  The start date must be on or before the end date.
                </p>
              )}

              <button
                className="btn btn-primary w-full"
                onClick={() => runExport('sales')}
                disabled={!!busy || invalidDates}
              >
                {busy === 'sales' ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Icon name="download" className="h-4 w-4" />
                )}
                {busy === 'sales'
                  ? 'Preparing report…'
                  : 'Download sales CSV'}
              </button>

              {exportNotice('sales')}
            </div>
          </PageCard>
        </div>
      </section>

      {/* Export information */}
      <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
        <Icon
          name="file"
          className="mt-0.5 h-5 w-5 shrink-0 text-gray-500"
        />
        <div>
          <p className="text-sm font-semibold text-gray-900">
            About your reports
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Analytics are generated from records currently available in
            your PharmaCycle.AI account. Sales metrics use the reporting
            period shown above, while completed transfers and verified
            partners follow their respective all-time counts. Sales
            exports contain quantities, not revenue. CSV exports can be
            opened with Microsoft Excel, Google Sheets or other
            spreadsheet applications.
          </p>
        </div>
      </div>
    </div>
  );
}
