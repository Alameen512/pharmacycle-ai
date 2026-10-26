'use client';
import { EmptyState, ErrorState, LoadingBlock, PageCard, StatCard } from '@/components/ui';
import { formatDate, num } from '@/lib/format';
import { useApi } from '@/lib/useApi';

type Counts = Record<'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED', number>;
type Summary = {
  window: { days: number; from: string; to: string };
  categories: { category: string; records: number; units: number }[];
  transfers: { incoming: Counts; outgoing: Counts; completed: number };
  atRiskUnits: number;
  partners: number;
  sales: { recordCount: number; unitsSold: number; unitsOnHand: number; salesToStockRatio: number | null };
};

function Bars({ rows }: { rows: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-sm"><span className="text-gray-700">{r.label}</span><span className="font-medium text-gray-900">{num(r.value)}</span></div>
          <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function AnalysisPage() {
  const { data, error, loading, reload } = useApi<Summary>('/analytics/summary');
  if (loading && !data) return <LoadingBlock />;
  if (error || !data) return <div className="card"><ErrorState message={error || 'No data.'} onRetry={reload} /></div>;
  const { sales: s, transfers: t } = data;
  const stages: [string, keyof Counts, string][] = [['Pending', 'PENDING', '#f59e0b'], ['Accepted, awaiting receipt', 'ACCEPTED', '#2563eb'], ['Completed', 'COMPLETED', '#16a34a'], ['Rejected', 'REJECTED', '#dc2626'], ['Cancelled', 'CANCELLED', '#9ca3af']];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales-to-stock ratio" value={s.salesToStockRatio ?? 'n/a'} icon="chart" tone="green" hint={s.salesToStockRatio === null ? 'Needs recorded sales and stock' : `${num(s.unitsSold)} units sold ÷ ${num(s.unitsOnHand)} on hand`} />
        <StatCard label="Completed transfers" value={t.completed} icon="repeat" tone="blue" hint="Both directions, all time" />
        <StatCard label="At-risk units" value={num(data.atRiskUnits)} icon="alert" tone="orange" hint="Near-expiry and expired units" />
        <StatCard label="Verified partners" value={data.partners} icon="users" tone="purple" />
      </div>
      <p className="text-xs text-gray-500">Sales-to-stock ratio = units sold in the last {data.window.days} days ({formatDate(data.window.from)} to {formatDate(data.window.to)}) divided by usable units on hand today. It is a rough guide, not accounting inventory turnover, and only counts sales you recorded in the app ({s.recordCount} record{s.recordCount === 1 ? '' : 's'}).</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <PageCard title="Units on hand by category">
          <div className="p-5">{data.categories.length ? <Bars rows={data.categories.slice(0, 8).map((c) => ({ label: `${c.category} (${c.records} record${c.records === 1 ? '' : 's'})`, value: c.units, color: '#16a34a' }))} /> : <EmptyState title="No inventory yet" />}</div>
        </PageCard>
        <PageCard title="Transfer pipeline">
          <div className="space-y-6 p-5">
            {(['incoming', 'outgoing'] as const).map((d) => (
              <div key={d}>
                <p className="mb-3 text-sm font-medium text-gray-900">{d === 'incoming' ? 'Incoming (you supply)' : 'Outgoing (you requested)'}</p>
                {Object.values(t[d]).some((v) => v > 0) ? <Bars rows={stages.map(([label, k, color]) => ({ label, value: t[d][k], color }))} /> : <p className="text-sm text-gray-500">No requests yet.</p>}
              </div>
            ))}
          </div>
        </PageCard>
      </div>
    </div>
  );
}
