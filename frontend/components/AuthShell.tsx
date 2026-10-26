import Link from 'next/link';
import { BrandMark } from './Brand';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const login = title === 'Welcome back';
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 p-12 lg:flex">
        <div className="pointer-events-none absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-[400px] w-[400px] rounded-full bg-white/5" />
        <Link href="/" className="relative z-10 inline-flex w-fit rounded-xl focus-visible:outline-2 focus-visible:outline-white"><BrandMark light /></Link>
        {login ? (
          <div className="relative z-10">
            <h2 className="mb-6 text-4xl font-bold leading-tight text-white">Reduce Waste.<br />Share Medicines.<br />Save Lives.</h2>
            <p className="max-w-md text-lg leading-relaxed text-green-100">Join the network of pharmacies working together to ensure medicines reach those who need them before they expire.</p>
          </div>
        ) : <div />}
        <p className="relative z-10 text-sm text-green-200">© 2026 PharmaCycle.AI. All rights reserved.</p>
      </aside>
      <main className="flex flex-1 items-center justify-center overflow-y-auto bg-white px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-block lg:hidden"><BrandMark /></Link>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mb-8 mt-2 text-gray-500">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
