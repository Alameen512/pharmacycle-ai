import Link from 'next/link';
import { BrandMark, BrandSymbol } from '@/components/Brand';
import { Icon } from '@/components/ui';

const expiryItems = [
  { medicine: 'Metformin 850mg', detail: 'Expires in 14 days - Urgent transfer suggested', state: 'Review', tone: 'bg-amber-100 text-amber-800' },
  { medicine: 'Amoxicillin 500mg', detail: 'Expires in 28 days - 2 pharmacies nearby need this', state: 'Matched', tone: 'bg-green-100 text-green-800' },
  { medicine: 'Lisinopril 10mg', detail: 'Expires in 35 days - Forecast shows steady demand', state: 'Forecasted', tone: 'bg-blue-100 text-blue-800' },
];

const steps = [
  { icon: 'medCards' as const, title: 'List surplus stock', body: 'Add near-expiry or excess inventory in seconds. The platform flags what should move first.' },
  { icon: 'trendUp' as const, title: 'AI generates drug forecasts', body: 'Forecast demand patterns so pharmacies know what to hold, discount, or transfer before shortages happen.' },
  { icon: 'truck' as const, title: 'Transfer and save', body: 'Confirm the handoff, track progress, and keep medicine flowing to the right destination.' },
];

function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-green-500/15 via-emerald-300/10 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-[32px] border border-white/50 bg-[#0d4f3c] p-5 shadow-[0_40px_100px_rgba(13,79,60,0.28)]">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#ffbd2e]" /><span className="h-3 w-3 rounded-full bg-[#28ca41]" />
          <div className="ml-2 min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-xs text-white/60">pharmacycle.ai/overview</div>
        </div>
        <div className="rounded-[26px] bg-[#f3f7f4] p-4 md:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-[22px] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">EXPIRY ALERT</p><p className="mt-1 text-xl font-bold text-gray-950">3 items need attention</p></div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Act soon</span>
                </div>
                <div className="space-y-3">
                  {expiryItems.map((item) => <div key={item.medicine} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-4 py-3"><div className="min-w-0"><p className="text-sm font-semibold text-gray-900">{item.medicine}</p><p className="mt-0.5 text-xs text-gray-500">{item.detail}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold ${item.tone}`}>{item.state}</span></div>)}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] bg-white p-5 shadow-sm"><p className="text-[11px] font-semibold tracking-[0.28em] text-gray-400">DRUG FORECAST NEED</p><div className="mt-2 flex items-end gap-2"><span className="text-3xl font-extrabold tracking-tight text-gray-950">18</span><span className="pb-1 text-xs font-semibold text-green-700">signals this week</span></div><div className="mt-3 space-y-2"><div className="h-2 rounded-full bg-gray-100"><div className="h-full w-3/4 rounded-full bg-green-500" /></div><div className="h-2 rounded-full bg-gray-100"><div className="h-full w-1/2 rounded-full bg-emerald-400" /></div><div className="h-2 rounded-full bg-gray-100"><div className="h-full w-3/5 rounded-full bg-lime-400" /></div></div></div>
                <div className="flex items-center justify-between rounded-[22px] bg-white p-5 shadow-sm"><div><p className="text-[11px] font-semibold tracking-[0.28em] text-gray-400">INVENTORY HEALTH</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">94%</p><p className="text-xs text-gray-500">healthy or forecasted</p></div><span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.3 2.3 4.8-5" strokeLinecap="round" strokeLinejoin="round" /></svg></span></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-[22px] bg-white p-4 shadow-sm"><p className="text-[11px] font-semibold tracking-[0.28em] text-gray-400">FORECAST ENGINE</p><h3 className="mt-2 text-lg font-bold tracking-tight text-gray-950">AI generates drug forecasts</h3><p className="mt-2 text-sm leading-relaxed text-gray-600">Predict demand shifts before they hit the shelf so pharmacies can restock, discount, or transfer earlier.</p></div>
              <div className="rounded-[22px] bg-[#0d4f3c] p-4 text-white shadow-sm"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-green-300"><span aria-hidden="true">✧</span>LIVE NETWORK</p><div className="mt-3 space-y-3">{[{name:'Amoxicillin 500mg', detail:'Forecast indicates 12% increase in demand'}, {name:'Metformin 850mg', detail:'Expiry alert promoted to top priority'}, {name:'Lisinopril 10mg', detail:'Transfer recommendation ready'}].map((item) => <div key={item.name} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-sm font-semibold">{item.name}</p><p className="mt-0.5 text-xs text-white/60">{item.detail}</p></div>)}</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpiryPreview() {
  return (
    <div className="rounded-[32px] border border-white/60 bg-[#0d4f3c] p-5 text-white shadow-[0_40px_100px_rgba(13,79,60,0.22)]">
      <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold tracking-[0.3em] text-green-200">EXPIRY ALERT</p><h3 className="mt-1 text-xl font-bold sm:text-2xl">3 items need attention</h3></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-green-200">Priority view</span></div>
      <div className="mt-5 space-y-3">{[
        { name: 'Metformin 850mg', detail: 'Urgent transfer suggested', status: 'Review', color: 'bg-amber-400/20 text-amber-200' },
        { name: 'Amoxicillin 500mg', detail: '2 pharmacies nearby need this', status: 'Matched', color: 'bg-green-400/20 text-green-200' },
        { name: 'Lisinopril 10mg', detail: 'Forecast shows steady demand', status: 'Forecast', color: 'bg-blue-400/20 text-blue-200' },
      ].map((item) => <div key={item.name} className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/10 px-4 py-4"><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-white/60">{item.detail}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${item.color}`}>{item.status}</span></div>)}</div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(180deg,#f7fbf8_0%,#eef6f0_100%)] text-[#0e1a14]">
      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-12">
          <Link href="/" aria-label="PharmaCycle.AI home" className="flex items-center"><BrandMark size="sm" /></Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-[#567060] transition-colors hover:text-[#0d4f3c]">How It Works</a>
            <a href="#for-pharmacies" className="text-sm font-medium text-[#567060] transition-colors hover:text-[#0d4f3c]">For Pharmacies</a>
            <a href="#for-public" className="text-sm font-medium text-[#567060] transition-colors hover:text-[#0d4f3c]">For Public</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-white hover:text-gray-900">Login</Link>
            <Link href="/signup" className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700">Sign Up</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 pb-16 pt-16 md:px-12 md:pb-[98px] md:pt-24">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true"><div className="absolute left-1/2 top-20 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-green-200/30 blur-3xl" /><div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" /><div className="absolute left-10 top-16 hidden text-green-700/10 lg:block"><BrandSymbol size={480} /></div><div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-green-700/8 lg:block"><BrandSymbol size={640} /></div></div>
          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-green-100 bg-white/75 px-4 py-2 text-xs font-semibold text-green-700 shadow-sm backdrop-blur"><Icon name="sprout" className="h-[14px] w-[14px] text-green-600" />Empowering pharmacies and communities</div>
              <div className="max-w-3xl space-y-5">
                <h1 className="max-w-2xl font-[Syne,sans-serif] text-5xl font-extrabold leading-[1.02] tracking-tight text-gray-950 md:text-7xl">Reduce waste.<br />Share medicines.<br /><span className="text-green-600">Save lives.</span></h1>
                <p className="max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl">PharmaCycle.AI connects pharmacies and the general public to move surplus stock, surface expiry risk early, and generate demand forecasts that help medicine reach people instead of bins.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href="/signup" className="rounded-2xl bg-green-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_36px_rgba(22,163,74,0.18)] transition-colors hover:bg-green-700">Get Started</Link>
                <Link href="/login" className="rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50">Open Demo Dashboard</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[{ icon: 'verified' as const, title: 'Verified partners', text: 'Trusted pharmacy network across the platform' }, { icon: 'trendUp' as const, title: 'Drug forecasts', text: 'AI-generated demand signals to guide planning' }, { icon: 'warningCircle' as const, title: 'Expiry alerts', text: 'Clear action on stock nearing expiration' }].map((item) => <div key={item.title} className="rounded-[22px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700"><Icon name={item.icon} className="h-[18px] w-[18px]" /></span><h2 className="mt-3 text-sm font-bold text-gray-900">{item.title}</h2><p className="mt-1 text-xs leading-relaxed text-gray-500">{item.text}</p></div>)}
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
          <div className="mb-10 max-w-2xl"><p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.3em] text-green-600">HOW IT WORKS</p><h2 className="font-[Syne,sans-serif] text-3xl font-extrabold tracking-tight text-gray-950 md:text-5xl">Three steps. Zero waste.</h2><p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">From listing surplus to completing a transfer, the workflow stays quick, clear, and designed for real pharmacy operations.</p></div>
          <div className="grid gap-5 md:grid-cols-3">{steps.map((step) => <article key={step.title} className="rounded-[24px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700"><Icon name={step.icon} className="h-[22px] w-[22px]" /></span><h3 className="mb-2 text-lg font-bold text-gray-950">{step.title}</h3><p className="text-sm leading-relaxed text-gray-600">{step.body}</p></article>)}</div>
        </section>

        <section className="border-y border-white/50 bg-white/70 py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2 md:px-12">
            <article id="for-pharmacies" className="scroll-mt-24 space-y-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700"><Icon name="pharmacy" className="h-[18px] w-[18px]" /></span><h2 className="text-2xl font-bold text-gray-950">For Pharmacies</h2><p className="text-sm leading-relaxed text-gray-600">List excess stock, surface expiry alerts in a cleaner UI, and use AI forecasts to reduce waste while recovering value from medicines that still have demand.</p><ul className="space-y-2 text-sm text-gray-500">{['Real-time inventory management', 'AI expiry and demand insights', 'Automated transfer matching'].map((x) => <li key={x} className="flex items-center gap-2"><Icon name="checkCircle" className="h-[14px] w-[14px] shrink-0 text-green-700" />{x}</li>)}</ul></article>
            <article id="for-public" className="scroll-mt-24 space-y-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon name="person" className="h-[18px] w-[18px]" /></span><h2 className="text-2xl font-bold text-gray-950">For the Public</h2><p className="text-sm leading-relaxed text-gray-600">Search for available medicines, compare locations, and connect with verified pharmacies that are ready to help at a lower cost.</p><ul className="space-y-2 text-sm text-gray-500">{['Find affordable nearby medicine', 'Verified partner pharmacies', 'Reduce waste while saving money'].map((x) => <li key={x} className="flex items-center gap-2"><Icon name="checkCircle" className="h-[14px] w-[14px] shrink-0 text-green-700" />{x}</li>)}</ul></article>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4"><p className="inline-flex rounded-full bg-[#0d4f3c] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-green-200">EXPIRY ALERT UI</p><h2 className="font-[Syne,sans-serif] text-3xl font-extrabold tracking-tight text-gray-950 md:text-5xl">A cleaner alert system that feels like the landing page.</h2><p className="text-base leading-relaxed text-gray-600 md:text-lg">Expiry alerts now read like product highlights, with stronger hierarchy, softer surfaces, and clear action states instead of a plain list.</p></div>
            <ExpiryPreview />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
          <div className="rounded-[36px] bg-gradient-to-br from-[#1a7a5e] to-[#0d4f3c] px-8 py-16 text-center text-white shadow-[0_40px_100px_rgba(13,79,60,0.22)]"><h2 className="font-[Syne,sans-serif] text-3xl font-extrabold leading-tight text-white md:text-5xl">Ready to stop wasting medicine?</h2><p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">Join pharmacies already sharing stock, reducing expiry waste, and making medicine access a little easier for everyone.</p><div className="mt-10 flex flex-wrap justify-center gap-4"><Link href="/signup" className="rounded-2xl bg-white px-8 py-3.5 text-sm font-semibold text-[#0d4f3c] transition-opacity hover:opacity-90">Get Started Free</Link><Link href="/forgot-password" className="rounded-2xl border border-white/40 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">Forgot Password</Link></div></div>
        </section>
      </main>

      <footer className="bg-[#0e1a14] px-6 pb-9 pt-14 text-white/70 md:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 border-b border-white/[0.08] pb-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div><div><div className="font-bold leading-tight text-xl text-white">Pharma<span className="text-green-400">Cycle</span>.AI</div><div className="text-[10px] leading-tight text-green-100/80">Share. Save. Save Lives.</div></div><p className="mt-4 max-w-[260px] text-[13px] leading-relaxed text-white/40">Connecting pharmacies and communities so medicine reaches people, not bins.</p></div>
          <div><div className="mb-5 text-xs font-bold uppercase tracking-wide text-white/50">Product</div><div className="flex flex-col gap-2.5">{[['How It Works','#how-it-works'],['For Pharmacies','#for-pharmacies'],['For Public','#for-public'],['Dashboard Demo','/login']].map(([label,href]) => <Link key={label} href={href} className="text-sm text-white/55 transition-colors hover:text-green-400">{label}</Link>)}</div></div>
          <div><div className="mb-5 text-xs font-bold uppercase tracking-wide text-white/50">Company</div><div className="flex flex-col gap-2.5">{['About Us','Blog','Careers','Contact'].map((label) => <Link key={label} href="#" className="text-sm text-white/55 transition-colors hover:text-green-400">{label}</Link>)}</div></div>
          <div><div className="mb-5 text-xs font-bold uppercase tracking-wide text-white/50">Legal</div><div className="flex flex-col gap-2.5">{['Privacy Policy','Terms of Service','Cookie Policy','Compliance'].map((label) => <Link key={label} href="#" className="text-sm text-white/55 transition-colors hover:text-green-400">{label}</Link>)}</div></div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 pt-7 text-xs text-white/30 sm:flex-row"><div>© 2026 PharmaCycle.AI. All rights reserved.</div><div className="flex gap-5"><a href="mailto:support@pharmacycle.ai" className="transition-colors hover:text-green-400">support@pharmacycle.ai</a><Link href="#" className="transition-colors hover:text-green-400">Twitter</Link><Link href="#" className="transition-colors hover:text-green-400">LinkedIn</Link></div></div>
      </footer>
    </div>
  );
}
