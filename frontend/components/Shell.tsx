'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import { BrandMark } from './Brand';
import { Icon, Notice, type IconName } from './ui';

const NAV: { href: string; label: string; icon: IconName; title: string; subtitle: string }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home', title: 'Dashboard', subtitle: 'Your pharmacy at a glance' },
  { href: '/inventory', label: 'Inventory', icon: 'package', title: 'Inventory', subtitle: 'Manage your medicine stock and track inventory in real-time.' },
  { href: '/ai-insights', label: 'AI Insights', icon: 'zap', title: 'AI Insights', subtitle: 'Smart insights to help you reduce waste, optimize inventory and improve availability.' },
  { href: '/transfers', label: 'Transfers', icon: 'repeat', title: 'Transfers', subtitle: 'Find, request and manage medicine transfers between pharmacies.' },
  { href: '/pharmacies', label: 'Partner Pharmacies', icon: 'users', title: 'Partner Pharmacies', subtitle: 'View verified pharmacies connected to the network.' },
  { href: '/transfer-requests', label: 'Transfer Requests', icon: 'inbox', title: 'Transfer Requests', subtitle: 'Manage incoming and outgoing medicine transfer requests.' },
  { href: '/alerts', label: 'Alerts', icon: 'bell', title: 'Alerts', subtitle: 'Stay on top of inventory risks, transfers, and network updates.' },
  { href: '/scan', label: 'Scan Medicines', icon: 'camera', title: 'Scan Medicines', subtitle: 'Photograph a label to auto-fill medicine details.' },
  { href: '/analysis', label: 'Analysis', icon: 'chart', title: 'Analysis', subtitle: 'Deep-dive into inventory trends, category performance, and demand patterns.' },
  { href: '/reports', label: 'Reports', icon: 'file', title: 'Reports', subtitle: 'Export and review inventory and transfer reports.' },
  { href: '/settings', label: 'Settings', icon: 'sliders', title: 'Settings', subtitle: 'Manage your pharmacy profile, notifications, and preferences.' },
  { href: '/help', label: 'Help & Support', icon: 'help', title: 'Help & Support', subtitle: 'Find answers, get help, and learn how to make the most of PharmaCycle.AI.' },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'PC';
}

function NavList({ onNavigate, badges }: { onNavigate?: () => void; badges: { requests: number; alerts: number } }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {NAV.map((n) => {
        const active = pathname === n.href;
        return (
          <Link key={n.href} href={n.href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-600 ${active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600" />}
            <Icon name={n.icon} className={`h-[18px] w-[18px] ${active ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
            <span className="flex-1">{n.label}</span>
            {n.href === '/transfer-requests' && badges.requests > 0 && <span className="min-w-5 rounded-full bg-brand-100 px-1.5 py-0.5 text-center text-[11px] font-semibold text-brand-700">{badges.requests > 99 ? '99+' : badges.requests}</span>}
            {n.href === '/alerts' && badges.alerts > 0 && <span className="min-w-5 rounded-full bg-red-100 px-1.5 py-0.5 text-center text-[11px] font-semibold text-red-600">{badges.alerts > 99 ? '99+' : badges.alerts}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const meta = NAV.find((n) => n.href === pathname) ?? NAV[0];
  const [bump, setBump] = useState(0);
  const { data } = useApi<{ summary: { unread: number } }>('/alerts', { pageSize: 1, at: `${pathname}-${bump}` });
  const { data: requestSummary } = useApi<{ incoming: { PENDING: number } }>('/transfer-requests/summary');
  useEffect(() => {
    const on = () => setBump((b) => b + 1);
    window.addEventListener('pharmacycle:alerts-changed', on);
    return () => window.removeEventListener('pharmacycle:alerts-changed', on);
  }, []);
  const unread = data?.summary.unread ?? 0;
  const badges = { requests: requestSummary?.incoming.PENDING ?? 0, alerts: unread };
  const subtitle = pathname === '/dashboard' ? `Welcome back, ${session?.kind === 'pharmacy' ? session.pharmacy.name : 'Pharmacy'}` : meta.subtitle;

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  if (session?.kind !== 'pharmacy') return null;
  const { pharmacy, user } = session;
  const logout = () => {
    signOut();
    router.replace('/login');
  };

  const bell = (
    <Link href="/alerts" aria-label={unread ? `Alerts, ${unread} unread` : 'Alerts'} className="relative rounded-xl p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-600">
      <Icon name="bell" />
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">{unread > 99 ? '99+' : unread}</span>}
    </Link>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex items-center border-b border-gray-100 px-5 pb-4 pt-5"><BrandMark size="sm" /></div>
        <NavList badges={badges} />
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{initials(pharmacy.name)}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-900">{pharmacy.name}</p><p className="text-[11px] text-gray-400">{user.role || 'Pharmacist'}</p></div>
            <button onClick={logout} title="Sign out" aria-label="Sign out" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-brand-600"><Icon name="logout" className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDrawer(false)} aria-hidden="true" />
          <aside role="dialog" aria-modal="true" aria-label="Navigation" className="absolute inset-y-0 left-0 flex w-60 flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
              <BrandMark size="sm" />
              <button className="btn btn-ghost btn-sm" onClick={() => setDrawer(false)} aria-label="Close menu"><Icon name="x" className="h-4 w-4" /></button>
            </div>
            <NavList onNavigate={() => setDrawer(false)} badges={badges} />
            <div className="border-t border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{initials(pharmacy.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-900">{pharmacy.name}</p><p className="text-[11px] text-gray-400">{user.role || 'Pharmacist'}</p></div><button onClick={logout} title="Sign out" aria-label="Sign out" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Icon name="logout" className="h-4 w-4" /></button></div>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-3 lg:hidden">
          <button className="btn btn-ghost btn-sm" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}><Icon name="menu" /></button>
          <div className="absolute left-1/2 -translate-x-1/2"><BrandMark size="sm" /></div>
          {bell}
        </header>
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-gray-200 bg-white px-6 lg:flex">
          <div>
            <p className="truncate text-xl font-bold text-gray-900">{meta.title}</p>
            <p className="-mt-0.5 truncate text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            {pathname === '/inventory' && <Link href="/inventory?add=1" onClick={() => window.dispatchEvent(new Event('pharmacycle:open-inventory-add'))} className="btn btn-primary"><Icon name="plus" className="h-4 w-4" />Add Medicine</Link>}
            {bell}
            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{initials(pharmacy.name)}</span>
              <div className="leading-tight">
                <p className="text-sm font-medium text-gray-900">{pharmacy.name}</p>
                <p className="text-[11px] text-gray-400">{pharmacy.city}, {pharmacy.state}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {pharmacy.verificationStatus === 'PENDING' && (
            <div className="mb-5"><Notice tone="orange"><strong>Awaiting verification.</strong> You can manage inventory and use the scanner now. Transfers, and your visibility to other pharmacies and shoppers, switch on once PharmaCycle.AI verifies your pharmacy.</Notice></div>
          )}
          {pharmacy.verificationStatus === 'REJECTED' && (
            <div className="mb-5"><Notice tone="red"><strong>Verification was not approved.</strong> Transfers stay disabled. Contact support to resolve this.</Notice></div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
