'use client';
import { useState } from 'react';
import { Badge, EmptyState, ErrorState, Icon, LoadingBlock, Notice, PageCard, Spinner } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { Insight } from '@/lib/types';
import { useApi } from '@/lib/useApi';

const SECTIONS = [
  { type: 'EXPIRY_RISK', title: 'Expiry risk', blurb: 'Which near-expiry or low-stock items need action, from the last 30 days of stock.' },
  { type: 'DEMAND_FORECAST', title: 'Demand forecast', blurb: 'Likely demand for the next 30 days, from your recorded sales over 90 days. Needs sales history.' },
  { type: 'RESTOCK_SUGGESTION', title: 'Restock', blurb: 'What to reorder, comparing stock on hand against the last 30 days of sales.' },
] as const;
const PRIORITY = { high: 'red', medium: 'orange', low: 'gray' } as const;

export default function InsightsPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ insights: Record<string, Insight | null>; configured: boolean }>('/insights');
  const [busy, setBusy] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function generate(type: string) {
    setBusy(type);
    setNotes((n) => ({ ...n, [type]: '' }));
    try {
      const r = await api<{ status: string; message?: string }>('/insights/generate', { method: 'POST', auth: true, body: { type } });
      if (r.status === 'ok') { toast.success('Insight generated.'); reload(); } else setNotes((n) => ({ ...n, [type]: r.message || 'Not enough data.' }));
    } catch (e) {
      setNotes((n) => ({ ...n, [type]: errorMessage(e) }));
      if (e instanceof ApiError && e.code === 'AI_NOT_CONFIGURED') reload();
    } finally {
      setBusy('');
    }
  }

  if (loading && !data) return <LoadingBlock />;
  if (error) return <div className="card"><ErrorState message={error} onRetry={reload} /></div>;
  const configured = data?.configured ?? false;

  return (
    <div className="space-y-5">
      {!configured && <Notice tone="orange">AI insights are not configured on this server, so nothing can be generated. An administrator needs to set <code>GROQ_API_KEY</code> on the backend.</Notice>}
      <Notice>Insights are decision support built only from your own stock and sales records. They can be wrong and are not medical advice. Generating one sends a summary of that data to the AI provider.</Notice>
      <div className="grid gap-5 xl:grid-cols-3">
        {SECTIONS.map((s) => {
          const ins = data?.insights[s.type] ?? null;
          return (
            <PageCard key={s.type} title={s.title} action={<button className="btn btn-secondary btn-sm" disabled={!configured || !!busy} onClick={() => generate(s.type)}>{busy === s.type ? <><Spinner className="h-3.5 w-3.5" />Generating…</> : <><Icon name="zap" className="h-3.5 w-3.5" />{ins ? 'Regenerate' : 'Generate'}</>}</button>}>
              <div className="space-y-3 p-5">
                <p className="text-xs text-gray-500">{s.blurb}</p>
                {notes[s.type] && <Notice tone="orange">{notes[s.type]}</Notice>}
                {!ins ? <EmptyState title="Nothing generated yet" /> : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400">{formatDateTime(ins.generatedAt)} · {ins.inputWindowDays}-day window{ins.model ? ` · ${ins.model}` : ''}</p>
                    <p className="text-sm text-gray-800">{ins.payload.summary}</p>
                    {ins.payload.inputs && <p className="text-xs text-gray-500">Based on: {Object.entries(ins.payload.inputs).map(([k, v]) => `${v} ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}`).join(', ')}.</p>}
                    <ul className="space-y-2">
                      {ins.payload.recommendations.map((r, i) => (
                        <li key={i} className="rounded-xl border border-gray-100 p-3">
                          <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-gray-900">{r.medicine}</p><Badge tone={PRIORITY[r.priority]}>{r.priority}</Badge></div>
                          <p className="mt-1 text-sm text-gray-700">{r.action}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{r.reason}</p>
                        </li>
                      ))}
                    </ul>
                    {ins.payload.disclaimer && <p className="text-xs text-gray-400">{ins.payload.disclaimer}</p>}
                  </div>
                )}
              </div>
            </PageCard>
          );
        })}
      </div>
    </div>
  );
}
