
'use client';

import { useMemo, useState } from 'react';
import { EmptyState, Icon, PageCard } from '@/components/ui';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Why can’t I request or list transfers yet?',
    a: 'New pharmacies start unverified. Transfers, appearing in search, and appearing in the partner directory unlock after PharmaCycle.AI verifies your pharmacy. Until then you can use inventory, the scanner, sales records, reports and settings.',
  },
  {
    q: 'How do I offer surplus stock to other pharmacies?',
    a: 'Open Transfers, switch to My listings, and choose List inventory for transfer. Pick an in-date item, the number of units and a discount. You can edit or cancel the listing later.',
  },
  {
    q: 'What happens after someone requests my stock?',
    a: 'You see the request under Transfer Requests, Incoming. Accepting reserves those units so they cannot be promised twice. When the other pharmacy confirms receipt, the units leave your inventory and are added to theirs. Rejecting releases any reservation.',
  },
  {
    q: 'Does the app track deliveries?',
    a: 'No. “Accepted” means stock is reserved and waiting to be handed over. Delivery and payment are arranged directly between the two pharmacies, and the receiving pharmacy confirms receipt in the app.',
  },
  {
    q: 'Is the NAFDAC number checked?',
    a: 'No. It is stored exactly as you type or scan it. PharmaCycle.AI does not check it against the NAFDAC register, so check registration details on the official NAFDAC channels when it matters.',
  },
  {
    q: 'How do stock statuses work?',
    a: 'Out of stock at 0 units. Expired once the expiry date has passed. Near expiry within 30 days of expiry. Low stock at 50 units or fewer. Otherwise healthy. Dates use Nigerian (Lagos) calendar days, and statuses are rechecked daily.',
  },
  {
    q: 'Why are AI insights empty or unavailable?',
    a: 'Insights need AI to be configured on the server. The demand forecast also needs recorded sales: use the sale button on the Inventory page. With too little history the app says so instead of guessing.',
  },
  {
    q: 'How does scanning work?',
    a: 'Take or upload a photo of the label. If server OCR is configured it reads the label; otherwise your browser reads it, which is less accurate. You always review and correct the details before saving. Barcode scanning needs a browser that supports it and only matches numbers already in your inventory.',
  },
  {
    q: 'What do the CSV reports include?',
    a: 'All matching records, not just a page. The inventory report can be filtered by status and the transfer report by request date. Cells are quoted so commas and quotes in names do not break the file.',
  },
  {
    q: 'Which notifications can I switch off?',
    a: 'In Settings you can switch expiry, low-stock and transfer alerts, and the two email types. Email is only sent when the server has email configured; otherwise those messages are recorded as skipped.',
  },
];

export default function HelpPage() {
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return FAQ;

    return FAQ.filter((item) =>
      `${item.q} ${item.a}`.toLowerCase().includes(search)
    );
  }, [q]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-700 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative max-w-2xl">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-green-50">
            <Icon name="help" className="h-3.5 w-3.5" />
            Help centre
          </span>

          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            How can we help?
          </h2>

          <p className="mt-2 max-w-lg text-sm leading-relaxed text-green-50/90">
            Find answers to common questions about managing stock, connecting
            with pharmacies and using PharmaCycle.AI.
          </p>

          <div className="mt-6 flex max-w-xl items-center gap-3 rounded-xl border border-white/20 bg-white px-4 py-3 shadow-lg shadow-black/5">
            <Icon name="search" className="h-5 w-5 shrink-0 text-gray-400" />

            <input
              aria-label="Search help articles"
              type="search"
              placeholder="Search for an answer..."
              className="w-full border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Clear
              </button>
            )}
          </div>

          <p className="mt-3 text-xs text-green-50/80">
            {q
              ? `${shown.length} matching ${shown.length === 1 ? 'answer' : 'answers'}`
              : `${FAQ.length} frequently asked questions`}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="card flex flex-col p-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon name="inbox" className="h-5 w-5" />
          </div>

          <h3 className="text-sm font-bold text-gray-900">Email support</h3>

          <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-500">
            {SUPPORT_EMAIL
              ? 'Need assistance? Send our support team an email.'
              : 'A support email has not been configured for this deployment.'}
          </p>

          {SUPPORT_EMAIL ? (
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Contact support
              <Icon name="chevronDown" className="h-3.5 w-3.5 -rotate-90" />
            </a>
          ) : (
            <span className="mt-4 text-xs font-medium text-gray-400">
              Unavailable
            </span>
          )}
        </article>

        <article className="card flex flex-col p-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon name="help" className="h-5 w-5" />
          </div>

          <h3 className="text-sm font-bold text-gray-900">Live chat</h3>

          <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-500">
            Live chat support is not currently available on this deployment.
          </p>

          <span className="mt-4 inline-flex w-fit items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
            Not available
          </span>
        </article>

        <article className="card flex flex-col p-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Icon name="file" className="h-5 w-5" />
          </div>

          <h3 className="text-sm font-bold text-gray-900">Documentation</h3>

          <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-500">
            A separate documentation site has not been set up yet.
          </p>

          <span className="mt-4 inline-flex w-fit items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
            Coming later
          </span>
        </article>
      </section>

      <PageCard title="Frequently asked questions">
        <div className="border-b border-gray-100 px-5 py-3">
          <p className="text-xs text-gray-500">
            {q
              ? `Showing ${shown.length} of ${FAQ.length} questions`
              : 'Browse answers about your PharmaCycle.AI account and features.'}
          </p>
        </div>

        <div className="space-y-2 p-4 sm:p-5">
          {shown.length === 0 ? (
            <EmptyState
              title="No matching questions"
              body="Try another search term or contact the support team."
              action={
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="btn btn-secondary"
                >
                  Clear search
                </button>
              }
            />
          ) : (
            shown.map((item, index) => (
              <details
                key={item.q}
                className="group rounded-xl border border-gray-100 transition-colors open:border-brand-100 open:bg-brand-50/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-600 group-open:hover:bg-transparent">
                  <span className="flex items-start gap-3">
                    <span className="mt-0.5 text-xs font-semibold text-brand-600">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {item.q}
                  </span>

                  <Icon
                    name="chevronDown"
                    className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                  />
                </summary>

                <div className="px-4 pb-4 pl-11">
                  <p className="text-sm leading-7 text-gray-600">
                    {item.a}
                  </p>
                </div>
              </details>
            ))
          )}
        </div>
      </PageCard>

      <section className="card flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon name="leaf" className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Still need a hand?
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {SUPPORT_EMAIL
                ? 'Our support team is available through email for further assistance.'
                : 'Support contact details are not configured for this deployment.'}
            </p>
          </div>
        </div>

        {SUPPORT_EMAIL && (
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="btn btn-primary shrink-0"
          >
            <Icon name="inbox" className="mr-2 h-4 w-4" />
            Contact support
          </a>
        )}
      </section>
    </div>
  );
}
