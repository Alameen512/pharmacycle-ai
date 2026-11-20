
import Link from 'next/link';
import { BrandMark } from '@/components/Brand';
import { Icon } from '@/components/ui';

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'pharmacycleai@gmail.com';

const steps = [
  {
    number: '01',
    icon: 'package' as const,
    title: 'Manage your inventory',
    body: 'Record stock, scan medicine labels and keep track of quantities and expiry dates.',
  },
  {
    number: '02',
    icon: 'chart' as const,
    title: 'Discover opportunities',
    body: 'Use expiry alerts and available AI insights to identify stock that needs attention.',
  },
  {
    number: '03',
    icon: 'repeat' as const,
    title: 'Connect and transfer',
    body: 'List eligible surplus stock, receive requests from partner pharmacies and manage transfers.',
  },
];

function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-5 rounded-[36px] bg-gradient-to-br from-green-500/15 via-emerald-300/10 to-transparent blur-2xl" />

      <div className="relative overflow-hidden rounded-[28px] border border-white/50 bg-[#0d4f3c] p-4 shadow-[0_35px_90px_rgba(13,79,60,0.24)] sm:p-5">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28ca41]" />
          <div className="ml-2 min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-xs text-white/60">
            pharmacycle.ai/dashboard
          </div>
        </div>

        <div className="rounded-[22px] bg-[#f3f7f4] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Pharmacy workspace
              </p>
              <h3 className="mt-1 text-lg font-bold text-gray-950">
                Your stock at a glance
              </h3>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              Overview
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Inventory', value: 'Stock records', icon: 'package' as const },
              { label: 'Marketplace', value: 'Surplus listings', icon: 'repeat' as const },
              { label: 'Insights', value: 'AI analysis', icon: 'chart' as const },
              { label: 'Network', value: 'Partner pharmacies', icon: 'users' as const },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <p className="mt-3 text-xs text-gray-500">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-gray-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  Inventory attention
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Identify stock that needs reviewing.
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Icon name="alert" className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { label: 'Expiry monitoring', color: 'bg-amber-400', width: 'w-3/4' },
                { label: 'Stock management', color: 'bg-green-500', width: 'w-full' },
                { label: 'Transfer activity', color: 'bg-blue-500', width: 'w-2/3' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                    <span>{item.label}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${item.width} ${item.color}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-center text-[10px] text-gray-400">
            Illustrative product preview
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(180deg,#f7fbf8_0%,#eef6f0_100%)] text-[#0e1a14]">
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="PharmaCycle.AI home">
            <BrandMark size="sm" />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 transition-colors hover:text-green-700">
              How it works
            </a>
            <a href="#pharmacies" className="text-sm font-medium text-gray-600 transition-colors hover:text-green-700">
              For pharmacies
            </a>
            <a href="#public" className="text-sm font-medium text-gray-600 transition-colors hover:text-green-700">
              For the public
            </a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
            >
              Join PharmaCycle
            </Link>
          </div>

          <details className="relative sm:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
              <Icon name="menu" className="h-4 w-4" />
              Menu
            </summary>
            <nav className="absolute right-0 top-12 z-50 flex w-56 flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
              <a href="#how-it-works" className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">How it works</a>
              <a href="#pharmacies" className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">For pharmacies</a>
              <a href="#public" className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">For the public</a>
              <div className="my-1 border-t border-gray-100" />
              <Link href="/search" className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Find medicines</Link>
              <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Login</Link>
              <Link href="/signup" className="rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white">Join PharmaCycle</Link>
            </nav>
          </details>
        </div>
      </header>

      <main>
        <section className="relative px-5 pb-20 pt-16 sm:px-8 md:pb-24 md:pt-24 lg:px-12">
          <div className="pointer-events-none absolute -right-32 top-12 h-96 w-96 rounded-full bg-green-200/30 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-green-100 bg-white/75 px-4 py-2 text-xs font-semibold text-green-700 shadow-sm">
                <Icon name="leaf" className="h-4 w-4" />
                A smarter way to manage medicine stock
              </div>

              <div className="max-w-3xl space-y-5">
                <h1 className="font-[Syne,sans-serif] text-5xl font-extrabold leading-[1.04] tracking-tight text-gray-950 sm:text-6xl lg:text-7xl">
                  Reduce waste.
                  <br />
                  Share medicines.
                  <br />
                  <span className="text-green-600">Save lives.</span>
                </h1>

                <p className="max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
                  PharmaCycle.AI connects pharmacies to help manage surplus
                  medicines, identify expiry risks and coordinate stock
                  transfers. It also helps the public find medicines available
                  through participating pharmacies.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_36px_rgba(22,163,74,0.18)] transition-colors hover:bg-green-700"
                >
                  Register your pharmacy
                  <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
                </Link>

                <Link
                  href="/search"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <Icon name="search" className="h-4 w-4" />
                  Find medicines
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: 'package' as const,
                    title: 'Inventory control',
                    text: 'Keep stock records organised.',
                  },
                  {
                    icon: 'alert' as const,
                    title: 'Expiry monitoring',
                    text: 'Know which stock needs attention.',
                  },
                  {
                    icon: 'repeat' as const,
                    title: 'Stock transfers',
                    text: 'Connect with partner pharmacies.',
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700">
                      <Icon name={item.icon} className="h-5 w-5" />
                    </span>
                    <h2 className="mt-3 text-sm font-bold text-gray-900">{item.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <ProductPreview />
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20 lg:px-12">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-green-600">
              HOW IT WORKS
            </p>
            <h2 className="font-[Syne,sans-serif] text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl md:text-5xl">
              Better stock management, one step at a time.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              A practical workflow that helps pharmacies organise inventory
              and make better use of available stock.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="rounded-[24px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                    <Icon name={step.icon} className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-bold text-green-700/50">{step.number}</span>
                </div>
                <h3 className="mb-2 mt-5 text-lg font-bold text-gray-950">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/60 bg-white/70 py-16 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 md:grid-cols-2 lg:px-12">
            <article id="pharmacies" className="scroll-mt-24 space-y-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                <Icon name="pharmacy" className="h-6 w-6" />
              </span>
              <h2 className="text-2xl font-bold text-gray-950">For pharmacies</h2>
              <p className="text-sm leading-relaxed text-gray-600">
                Manage inventory, monitor expiry dates, explore AI-generated
                insights and connect with other pharmacies to list or request
                eligible surplus stock.
              </p>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  'Inventory and stock monitoring',
                  'Medicine scanning and sales records',
                  'Expiry alerts and AI insights',
                  'Inter-pharmacy stock transfers',
                  'Reports and pharmacy network',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Icon name="checkCircle" className="h-4 w-4 shrink-0 text-green-700" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="inline-flex items-center gap-2 pt-2 text-sm font-bold text-green-700 hover:text-green-800">
                Get started as a pharmacy
                <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
              </Link>
            </article>

            <article id="public" className="scroll-mt-24 space-y-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Icon name="person" className="h-6 w-6" />
              </span>
              <h2 className="text-2xl font-bold text-gray-950">For the public</h2>
              <p className="text-sm leading-relaxed text-gray-600">
                Search for medicines listed by participating pharmacies and
                explore available options. Availability and final purchase
                arrangements are confirmed directly with the pharmacy.
              </p>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  'Search for available medicines',
                  'Explore participating pharmacies',
                  'View listed stock information',
                  'Contact pharmacies about availability',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Icon name="checkCircle" className="h-4 w-4 shrink-0 text-green-700" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/search" className="inline-flex items-center gap-2 pt-2 text-sm font-bold text-green-700 hover:text-green-800">
                Search medicines
                <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
              </Link>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20 lg:px-12">
          <div className="rounded-[32px] bg-gradient-to-br from-[#1a7a5e] to-[#0d4f3c] px-6 py-14 text-center text-white shadow-[0_35px_90px_rgba(13,79,60,0.2)] sm:px-10 md:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-200">
              MAKE EVERY UNIT COUNT
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl font-[Syne,sans-serif] text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">
              Better medicine management starts here.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
              Join the PharmaCycle.AI network and take a smarter approach to
              inventory, surplus stock and medicine availability.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-[#0d4f3c] transition-opacity hover:opacity-90">
                Register your pharmacy
              </Link>
              <Link href="/search" className="rounded-xl border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10">
                Find medicines
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0e1a14] px-5 pb-8 pt-12 text-white/70 sm:px-8 md:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 border-b border-white/10 pb-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center">
              <BrandMark size="sm" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/45">
              Connecting pharmacies and communities to reduce medicine waste
              and improve access to available stock.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-white/50">
              Explore
            </h3>
            <div className="flex flex-col gap-3">
              <Link href="/search" className="text-sm text-white/60 transition-colors hover:text-green-400">Find medicines</Link>
              <Link href="/signup" className="text-sm text-white/60 transition-colors hover:text-green-400">Register a pharmacy</Link>
              <Link href="/login" className="text-sm text-white/60 transition-colors hover:text-green-400">Pharmacy login</Link>
              <a href="#how-it-works" className="text-sm text-white/60 transition-colors hover:text-green-400">How it works</a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-white/50">
              Information
            </h3>
            <div className="flex flex-col gap-3">
              <Link href="/legal" className="text-sm text-white/60 transition-colors hover:text-green-400">Privacy and terms</Link>
              <Link href="/help" className="text-sm text-white/60 transition-colors hover:text-green-400">Help centre</Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm text-white/60 transition-colors hover:text-green-400">Contact support</a>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 pt-7 text-center text-xs text-white/35 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} PharmaCycle.AI. All rights reserved.</p>
          <p>Share. Save. Save lives.</p>
        </div>
      </footer>
    </div>
  );
}
