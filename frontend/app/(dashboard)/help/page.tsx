'use client';
import { useMemo, useState } from 'react';
import { EmptyState, Icon, PageCard } from '@/components/ui';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';

const FAQ: { q: string; a: string }[] = [
  { q: 'Why can’t I request or list transfers yet?', a: 'New pharmacies start unverified. Transfers, appearing in search, and appearing in the partner directory unlock after PharmaCycle.AI verifies your pharmacy. Until then you can use inventory, the scanner, sales records, reports and settings.' },
  { q: 'How do I offer surplus stock to other pharmacies?', a: 'Open Transfers, switch to My listings, and choose List inventory for transfer. Pick an in-date item, the number of units and a discount. You can edit or cancel the listing later.' },
  { q: 'What happens after someone requests my stock?', a: 'You see the request under Transfer Requests, Incoming. Accepting reserves those units so they cannot be promised twice. When the other pharmacy confirms receipt, the units leave your inventory and are added to theirs. Rejecting releases any reservation.' },
  { q: 'Does the app track deliveries?', a: 'No. “Accepted” means stock is reserved and waiting to be handed over. Delivery and payment are arranged directly between the two pharmacies, and the receiving pharmacy confirms receipt in the app.' },
  { q: 'Is the NAFDAC number checked?', a: 'No. It is stored exactly as you type or scan it. PharmaCycle.AI does not check it against the NAFDAC register, so check registration details on the official NAFDAC channels when it matters.' },
  { q: 'How do stock statuses work?', a: 'Out of stock at 0 units. Expired once the expiry date has passed. Near expiry within 30 days of expiry. Low stock at 50 units or fewer. Otherwise healthy. Dates use Nigerian (Lagos) calendar days, and statuses are rechecked daily.' },
  { q: 'Why are AI insights empty or unavailable?', a: 'Insights need AI to be configured on the server. The demand forecast also needs recorded sales: use the sale button on the Inventory page. With too little history the app says so instead of guessing.' },
  { q: 'How does scanning work?', a: 'Take or upload a photo of the label. If server OCR is configured it reads the label; otherwise your browser reads it, which is less accurate. You always review and correct the details before saving. Barcode scanning needs a browser that supports it and only matches numbers already in your inventory.' },
  { q: 'What do the CSV reports include?', a: 'All matching records, not just a page. The inventory report can be filtered by status and the transfer report by request date. Cells are quoted so commas and quotes in names do not break the file.' },
  { q: 'Which notifications can I switch off?', a: 'In Settings you can switch expiry, low-stock and transfer alerts, and the two email types. Email is only sent when the server has email configured; otherwise those messages are recorded as skipped.' },
];

export default function HelpPage() {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? FAQ.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(n)) : FAQ;
  }, [q]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-gradient-to-br from-brand-600 to-emerald-700 p-6 text-white sm:p-8">
        <h2 className="mb-2 text-xl font-bold">How can we help?</h2>
        <p className="mb-4 text-sm text-green-100">Search the answers below or get in touch with the support team.</p>
        <div className="flex max-w-lg items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <Icon name="search" className="h-[18px] w-[18px] shrink-0 text-green-200" />
          <input aria-label="Search help articles" type="search" placeholder="Search for help articles..." className="w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-green-100 focus:ring-0" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="card p-5 transition-shadow hover:shadow-md">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon name="inbox" className="h-5 w-5" /></div>
          <h3 className="mb-1 text-sm font-bold text-gray-900">Email support</h3>
          <p className="mb-3 text-xs text-gray-500">{SUPPORT_EMAIL || 'A support email has not been configured.'}</p>
          {SUPPORT_EMAIL ? <a className="text-xs font-semibold text-brand-600 hover:text-brand-700" href={`mailto:${SUPPORT_EMAIL}`}>Send email →</a> : <span className="text-xs text-gray-400">Unavailable</span>}
        </article>
        <article className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon name="help" className="h-5 w-5" /></div>
          <h3 className="mb-1 text-sm font-bold text-gray-900">Live chat</h3>
          <p className="mb-3 text-xs text-gray-500">Live chat is not available for this deployment.</p>
          <span className="text-xs text-gray-400">Unavailable</span>
        </article>
        <article className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600"><Icon name="file" className="h-5 w-5" /></div>
          <h3 className="mb-1 text-sm font-bold text-gray-900">Documentation</h3>
          <p className="mb-3 text-xs text-gray-500">A documentation site has not been set up yet.</p>
          <span className="text-xs text-gray-400">Unavailable</span>
        </article>
      </div>

      <PageCard title="Frequently Asked Questions">
        <div className="space-y-3 p-5">
          {shown.length === 0 ? <EmptyState title="No matching questions" body="Try a different search, or contact support." /> : shown.map((f) => (
            <details key={f.q} className="group rounded-xl border border-gray-100">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-4 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-600">
                {f.q}<Icon name="chevronDown" className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-gray-500">{f.a}</p>
            </details>
          ))}
        </div>
      </PageCard>

      <section className="card p-6 text-center">
        <Icon name="leaf" className="mx-auto mb-3 h-8 w-8 text-brand-600" />
        <h3 className="mb-1 text-base font-bold text-gray-900">Still need help?</h3>
        <p className="mb-4 text-sm text-gray-500">{SUPPORT_EMAIL ? 'Send the support team a message and include the page you were using.' : 'Support contact details are not configured for this deployment.'}</p>
        {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-primary">Contact support</a>}
      </section>
    </div>
  );
}
