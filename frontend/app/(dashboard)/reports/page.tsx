'use client';
import { useState } from 'react';
import { Field, Icon, PageCard, Spinner, StatCard } from '@/components/ui';
import { downloadCsv, errorMessage } from '@/lib/api';
import { STOCK_META } from '@/lib/format';
import { useApi } from '@/lib/useApi';

type Result = { ok: boolean; text: string };

export default function ReportsPage() {
  const inventory = useApi<{ total: number; nearExpiry: number }>('/inventory/stats');
  const analytics = useApi<{ transfers: { completed: number }; partners: number }>('/analytics/summary');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState('');
  const [res, setRes] = useState<Record<string, Result>>({});

  async function run(key: 'inventory' | 'transfers') {
    setBusy(key);
    setRes((r) => ({ ...r, [key]: { ok: true, text: '' } }));
    try {
      const out = key === 'inventory'
        ? await downloadCsv('/reports/inventory.csv', { status })
        : await downloadCsv('/reports/transfers.csv', { from, to });
      setRes((r) => ({ ...r, [key]: { ok: true, text: `Downloaded ${out.filename} with ${out.rows} row${out.rows === 1 ? '' : 's'}.` } }));
    } catch (e) {
      setRes((r) => ({ ...r, [key]: { ok: false, text: errorMessage(e) } }));
    } finally {
      setBusy('');
    }
  }
  const note = (k: string) => res[k]?.text ? <p role={res[k].ok ? 'status' : 'alert'} className={`text-sm ${res[k].ok ? 'text-brand-700' : 'text-red-700'}`}>{res[k].text}</p> : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total inventory" value={inventory.data?.total ?? '…'} icon="package" tone="green" />
        <StatCard label="Near expiry" value={inventory.data?.nearExpiry ?? '…'} icon="alert" tone="orange" />
        <StatCard label="Completed transfers" value={analytics.data?.transfers.completed ?? '…'} icon="repeat" tone="blue" />
        <StatCard label="Available pharmacies" value={analytics.data?.partners ?? '…'} icon="users" tone="purple" />
      </div>
      <PageCard title="Available Reports">
        <p className="px-5 pt-5 text-sm text-gray-500">Download inventory and transfer data for external analysis.</p>
        <div className="grid gap-6 p-5 lg:grid-cols-2">
      <section className="rounded-xl border border-gray-100 p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div><p className="text-sm font-semibold text-gray-900">Inventory Report</p><p className="mt-1 text-xs text-gray-400">All medicine records, batches, quantities and prices</p></div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon name="package" className="h-5 w-5" /></span>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-gray-600">Every inventory record, not just the first page. Prices are in naira; the NAFDAC column is the number as you entered it.</p>
          <Field label="Status filter" htmlFor="rp-status">
            <select id="rp-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(STOCK_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <button className="btn btn-primary" onClick={() => run('inventory')} disabled={!!busy}>{busy === 'inventory' ? <Spinner className="h-4 w-4" /> : <Icon name="download" className="h-4 w-4" />}Download inventory CSV</button>
          {note('inventory')}
        </div>
      </section>
      <section className="rounded-xl border border-gray-100 p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div><p className="text-sm font-semibold text-gray-900">Transfer Report</p><p className="mt-1 text-xs text-gray-400">Incoming and outgoing transfer requests</p></div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon name="repeat" className="h-5 w-5" /></span>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-gray-600">Incoming and outgoing transfer requests, by the date they were requested. Leave the dates empty for all time.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From" htmlFor="rp-from"><input id="rp-from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To (inclusive)" htmlFor="rp-to"><input id="rp-to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
          <button className="btn btn-primary" onClick={() => run('transfers')} disabled={!!busy || (!!from && !!to && from > to)}>{busy === 'transfers' ? <Spinner className="h-4 w-4" /> : <Icon name="download" className="h-4 w-4" />}Download transfers CSV</button>
          {from && to && from > to && <p className="text-sm text-red-700">The start date must be on or before the end date.</p>}
          {note('transfers')}
        </div>
      </section>
        </div>
      </PageCard>
    </div>
  );
}
