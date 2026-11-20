
'use client';

import { useState } from 'react';
import {
  Field,
  Icon,
  PageCard,
  Spinner,
  StatCard,
} from '@/components/ui';
import { downloadCsv, errorMessage } from '@/lib/api';
import { STOCK_META } from '@/lib/format';
import { useApi } from '@/lib/useApi';

type Result = {
  ok: boolean;
  text: string;
};

export default function ReportsPage() {
  const inventory = useApi<{
    total: number;
    nearExpiry: number;
  }>('/inventory/stats');

  const analytics = useApi<{
    transfers: { completed: number };
    partners: number;
  }>('/analytics/summary');

  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState('');
  const [res, setRes] = useState<Record<string, Result>>({});

  async function run(key: 'inventory' | 'transfers') {
    setBusy(key);
    setRes((current) => ({
      ...current,
      [key]: { ok: true, text: '' },
    }));

    try {
      const output =
        key === 'inventory'
          ? await downloadCsv('/reports/inventory.csv', { status })
          : await downloadCsv('/reports/transfers.csv', { from, to });

      setRes((current) => ({
        ...current,
        [key]: {
          ok: true,
          text: `Downloaded ${output.filename} with ${output.rows} row${output.rows === 1 ? '' : 's'}.`,
        },
      }));
    } catch (error) {
      setRes((current) => ({
        ...current,
        [key]: {
          ok: false,
          text: errorMessage(error),
        },
      }));
    } finally {
      setBusy('');
    }
  }

  function note(key: string) {
    const result = res[key];

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

  const invalidDates = !!from && !!to && from > to;

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      {/* Introduction */}
      <section>
        <span className="mb-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Data & exports
        </span>

        <h1 className="text-2xl font-bold tracking-tight text-gray-950">
          Reports
        </h1>

        <p className="mt-1 max-w-xl text-sm text-gray-500">
          Export your pharmacy records for bookkeeping, analysis and
          business reporting.
        </p>
      </section>

      {/* Overview */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Your data at a glance
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total inventory"
            value={inventory.data?.total ?? '…'}
            icon="package"
            tone="green"
            hint="Recorded stock entries"
          />

          <StatCard
            label="Near expiry"
            value={inventory.data?.nearExpiry ?? '…'}
            icon="alert"
            tone="orange"
            hint="Inventory requiring attention"
          />

          <StatCard
            label="Completed transfers"
            value={analytics.data?.transfers.completed ?? '…'}
            icon="repeat"
            tone="blue"
            hint="Incoming and outgoing"
          />

          <StatCard
            label="Verified pharmacies"
            value={analytics.data?.partners ?? '…'}
            icon="users"
            tone="purple"
            hint="Available network partners"
          />
        </div>
      </section>

      {/* Export centre */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Export centre
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose the records you want to download.
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
                onClick={() => run('inventory')}
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

              {note('inventory')}
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
                onClick={() => run('transfers')}
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

              {note('transfers')}
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
            About your downloads
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Reports are exported in CSV format and can be opened with
            Microsoft Excel, Google Sheets or other spreadsheet
            applications. Exports contain records available to your
            pharmacy account.
          </p>
        </div>
      </div>
    </div>
  );
}
