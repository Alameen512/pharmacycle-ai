
'use client';

import { useState } from 'react';
import {
  Badge,
  EmptyState,
  ErrorState,
  Icon,
  LoadingBlock,
  Notice,
  Spinner,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { Insight } from '@/lib/types';
import { useApi } from '@/lib/useApi';

const SECTIONS = [
  {
    type: 'EXPIRY_RISK',
    title: 'Expiry risk',
    subtitle: 'Protect stock value',
    blurb:
      'Identify near-expiry and low-stock medicines that may need attention.',
    description: 'Uses your stock records from the last 30 days.',
    icon: 'alert',
    tone: 'orange',
  },
  {
    type: 'DEMAND_FORECAST',
    title: 'Demand forecast',
    subtitle: 'Understand demand',
    blurb:
      'Estimate which medicines are likely to be in demand over the next 30 days.',
    description: 'Uses up to 90 days of recorded sales history.',
    icon: 'trendUp',
    tone: 'blue',
  },
  {
    type: 'RESTOCK_SUGGESTION',
    title: 'Restock suggestions',
    subtitle: 'Plan your next order',
    blurb:
      'Find medicines that may need replenishment based on stock and sales.',
    description: 'Compares stock on hand with the last 30 days of sales.',
    icon: 'package',
    tone: 'green',
  },
] as const;

const PRIORITY = {
  high: 'red',
  medium: 'orange',
  low: 'gray',
} as const;

export default function InsightsPage() {
  const toast = useToast();

  const {
    data,
    error,
    loading,
    reload,
  } = useApi<{
    insights: Record<string, Insight | null>;
    configured: boolean;
  }>('/insights');

  const [busy, setBusy] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function generate(type: string) {
    setBusy(type);
    setNotes((current) => ({ ...current, [type]: '' }));

    try {
      const response = await api<{
        status: string;
        message?: string;
      }>('/insights/generate', {
        method: 'POST',
        auth: true,
        body: { type },
      });

      if (response.status === 'ok') {
        toast.success('Insight generated successfully.');
        reload();
      } else {
        setNotes((current) => ({
          ...current,
          [type]: response.message || 'Not enough data to generate this insight.',
        }));
      }
    } catch (e) {
      setNotes((current) => ({
        ...current,
        [type]: errorMessage(e),
      }));

      if (e instanceof ApiError && e.code === 'AI_NOT_CONFIGURED') {
        reload();
      }
    } finally {
      setBusy('');
    }
  }

  if (loading && !data) return <LoadingBlock />;

  if (error) {
    return (
      <div className="card">
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  const configured = data?.configured ?? false;
  const insightCount = SECTIONS.filter(
    (section) => data?.insights[section.type]
  ).length;

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      {/* Introduction */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <span className="mb-2 inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
            AI-powered intelligence
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">
            AI Insights
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Turn your inventory and sales records into practical decisions
            for your pharmacy.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
            <Icon name="zap" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-bold text-gray-900">
              {insightCount}/3
            </p>
            <p className="text-xs text-gray-500">Insights generated</p>
          </div>
        </div>
      </section>

      {!configured && (
        <Notice tone="orange">
          AI insights are not configured on this server. An administrator
          needs to set <code>GROQ_API_KEY</code> on the backend before
          insights can be generated.
        </Notice>
      )}

      <Notice>
        These insights are decision-support tools based on your pharmacy's
        stock and sales records. They may be inaccurate and are not medical
        advice. Generating an insight sends a summary of the relevant data
        to the configured AI provider.
      </Notice>

      {/* Insight categories */}
      <section className="grid min-w-0 gap-4 xl:grid-cols-3">
        {SECTIONS.map((section) => {
          const insight = data?.insights[section.type] ?? null;
          const isBusy = busy === section.type;

          return (
            <article
              key={section.type}
              className="card flex min-w-0 flex-col overflow-hidden"
            >
              <div className="border-b border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      section.tone === 'orange'
                        ? 'bg-orange-50 text-orange-700'
                        : section.tone === 'blue'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-green-50 text-green-700'
                    }`}
                  >
                    <Icon name={section.icon} className="h-5 w-5" />
                  </div>

                  {insight ? (
                    <Badge tone="green">Generated</Badge>
                  ) : (
                    <Badge tone="gray">Not generated</Badge>
                  )}
                </div>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {section.subtitle}
                </p>

                <h2 className="mt-1 text-lg font-bold text-gray-900">
                  {section.title}
                </h2>

                <p className="mt-2 min-h-[40px] text-sm leading-relaxed text-gray-500">
                  {section.blurb}
                </p>

                <p className="mt-3 text-xs text-gray-400">
                  {section.description}
                </p>

                <button
                  className="btn btn-primary mt-4 w-full"
                  disabled={!configured || !!busy}
                  onClick={() => generate(section.type)}
                >
                  {isBusy ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Generating insight…
                    </>
                  ) : (
                    <>
                      <Icon name="zap" className="h-4 w-4" />
                      {insight ? 'Regenerate insight' : 'Generate insight'}
                    </>
                  )}
                </button>

                {notes[section.type] && (
                  <div className="mt-3">
                    <Notice tone="orange">{notes[section.type]}</Notice>
                  </div>
                )}
              </div>

              {/* Generated insight */}
              <div className="flex-1 space-y-4 p-5">
                {!insight ? (
                  <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl bg-gray-50 px-4 py-6 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
                      <Icon name="zap" className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-medium text-gray-700">
                      No insight available yet
                    </p>
                    <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-gray-400">
                      Generate this insight to see recommendations based on
                      your pharmacy data.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-gray-400">
                        Last generated
                      </span>
                      <span className="text-xs font-medium text-gray-600">
                        {formatDateTime(insight.generatedAt)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm leading-relaxed text-gray-800">
                        {insight.payload.summary}
                      </p>
                    </div>

                    {insight.payload.inputs && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Data used
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(insight.payload.inputs).map(
                            ([key, value]) => (
                              <span
                                key={key}
                                className="rounded-lg border border-gray-100 bg-white px-2.5 py-1.5 text-xs text-gray-600"
                              >
                                <strong className="text-gray-900">
                                  {value}
                                </strong>{' '}
                                {key
                                  .replace(/([A-Z])/g, ' $1')
                                  .toLowerCase()}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Recommendations
                        </h3>
                        <span className="text-xs text-gray-400">
                          {insight.payload.recommendations.length} items
                        </span>
                      </div>

                      {insight.payload.recommendations.length === 0 ? (
                        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">
                          No specific recommendations at this time.
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {insight.payload.recommendations.map(
                            (recommendation, index) => (
                              <li
                                key={index}
                                className="rounded-xl border border-gray-100 p-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="min-w-0 break-words text-sm font-semibold text-gray-900">
                                    {recommendation.medicine}
                                  </p>
                                  <Badge tone={PRIORITY[recommendation.priority]}>
                                    {recommendation.priority}
                                  </Badge>
                                </div>

                                <p className="mt-2 text-sm leading-relaxed text-gray-800">
                                  {recommendation.action}
                                </p>

                                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                                  {recommendation.reason}
                                </p>
                              </li>
                            )
                          )}
                        </ul>
                      )}
                    </div>

                    {insight.payload.disclaimer && (
                      <p className="border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-400">
                        {insight.payload.disclaimer}
                      </p>
                    )}

                    <p className="text-xs text-gray-400">
                      Analysis window: {insight.inputWindowDays} days
                      {insight.model ? ` · Model: ${insight.model}` : ''}
                    </p>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
