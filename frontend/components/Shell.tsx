
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import { BrandMark } from './Brand';
import { Icon, Notice, type IconName } from './ui';

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  title: string;
  subtitle: string;
};

type NavGroup = {
  id: string;
  href: string;
  label: string;
  icon: IconName;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    href: '/dashboard',
    label: 'Home',
    icon: 'home',
    items: [],
  },
  {
    id: 'inventory',
    href: '/inventory',
    label: 'Inventory',
    icon: 'package',
    items: [
      {
        href: '/inventory',
        label: 'Stock management',
        icon: 'package',
        title: 'Inventory',
        subtitle: 'Manage your medicine stock and track inventory in real-time.',
      },
      {
        href: '/scan',
        label: 'Scan medicines',
        icon: 'camera',
        title: 'Scan Medicines',
        subtitle: 'Photograph a label to auto-fill medicine details.',
      },
    ],
  },
  {
    id: 'marketplace',
    href: '/transfers',
    label: 'Marketplace',
    icon: 'repeat',
    items: [
      {
        href: '/transfers',
        label: 'Browse medicines',
        icon: 'search',
        title: 'Marketplace',
        subtitle: 'Find, request and manage medicine transfers between pharmacies.',
      },
      {
        href: '/transfers?tab=mine',
        label: 'My listings',
        icon: 'package',
        title: 'My Listings',
        subtitle: 'Manage medicines your pharmacy has listed for transfer.',
      },
      {
        href: '/transfer-requests',
        label: 'Transfer requests',
        icon: 'inbox',
        title: 'Transfer Requests',
        subtitle: 'Manage incoming and outgoing medicine transfer requests.',
      },
    ],
  },
  {
    id: 'network',
    href: '/pharmacies',
    label: 'Network',
    icon: 'users',
    items: [
      {
        href: '/pharmacies',
        label: 'Partner pharmacies',
        icon: 'users',
        title: 'Partner Pharmacies',
        subtitle: 'View verified pharmacies connected to the network.',
      },
    ],
  },
  {
    id: 'insights',
    href: '/ai-insights',
    label: 'Insights',
    icon: 'zap',
    items: [
      {
        href: '/ai-insights',
        label: 'AI insights',
        icon: 'zap',
        title: 'AI Insights',
        subtitle: 'Smart insights to help you reduce waste, optimize inventory and improve availability.',
      },
      {
        href: '/analysis',
        label: 'Reports & Analytics',
        icon: 'chart',
        title: 'Reports & Analytics',
        subtitle: 'Track business performance, review inventory and transfers, and export reports.',
      },
      {
        href: '/alerts',
        label: 'Alerts',
        icon: 'bell',
        title: 'Alerts',
        subtitle: 'Stay on top of inventory risks, transfers, and network updates.',
      },
    ],
  },
];

const UTILITY_LINKS: NavItem[] = [
  {
    href: '/settings',
    label: 'Settings',
    icon: 'sliders',
    title: 'Settings',
    subtitle: 'Manage your pharmacy profile, notifications, and preferences.',
  },
  {
    href: '/help',
    label: 'Help & Support',
    icon: 'help',
    title: 'Help & Support',
    subtitle: 'Find answers, get help, and learn how to make the most of PharmaCycle.AI.',
  },
];

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || '')
      .join('')
      .toUpperCase() || 'PC'
  );
}

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  onNavigate,
  badges,
}: {
  onNavigate?: () => void;
  badges: { requests: number; alerts: number };
}) {
  const pathname = usePathname();

  const activeGroup = NAV_GROUPS.find((group) =>
    group.items.length
      ? group.items.some((item) => matchesPath(pathname, item.href))
      : pathname === group.href
  );

  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    activeGroup?.id ?? null
  );

  useEffect(() => {
    setExpandedGroup(activeGroup?.id ?? null);
  }, [activeGroup?.id]);

  const isItemActive = (item: NavItem) => {
    if (item.href === '/transfers') {
      return pathname === '/transfers';
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const renderBadge = (href: string) => {
    if (href === '/transfer-requests' && badges.requests > 0) {
      return (
        <span className="min-w-5 rounded-full bg-brand-100 px-1.5 py-0.5 text-center text-[11px] font-semibold text-brand-700">
          {badges.requests > 99 ? '99+' : badges.requests}
        </span>
      );
    }

    if (href === '/alerts' && badges.alerts > 0) {
      return (
        <span className="min-w-5 rounded-full bg-red-100 px-1.5 py-0.5 text-center text-[11px] font-semibold text-red-600">
          {badges.alerts > 99 ? '99+' : badges.alerts}
        </span>
      );
    }

    return null;
  };

  return (
    <nav
      aria-label="Main"
      className="flex-1 space-y-2 overflow-y-auto px-3 py-4"
    >
      {NAV_GROUPS.map((group) => {
        const active =
          group.items.length > 0
            ? group.items.some((item) => isItemActive(item))
            : pathname === group.href;

        const expanded = expandedGroup === group.id;

        return (
          <div key={group.id}>
            <div
              className={`group flex items-center rounded-xl transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Link
                href={group.href}
                onClick={onNavigate}
                aria-current={
                  group.id === 'home' && active ? 'page' : undefined
                }
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <Icon
                  name={group.icon}
                  className={`h-[18px] w-[18px] shrink-0 ${
                    active
                      ? 'text-brand-600'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                <span>{group.label}</span>
              </Link>

              {group.items.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGroup(expanded ? null : group.id)
                  }
                  aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.label}`}
                  aria-expanded={expanded}
                  className="rounded-lg p-2 text-gray-400 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  <Icon
                    name="chevronDown"
                    className={`h-4 w-4 transition-transform ${
                      expanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}
            </div>

            {group.items.length > 0 && expanded && (
              <div className="ml-5 mt-1 space-y-1 border-l border-gray-200 pl-3">
                {group.items.map((item) => {
                  const itemActive = isItemActive(item);

                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={itemActive ? 'page' : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-brand-600 ${
                        itemActive
                          ? 'bg-brand-50 font-semibold text-brand-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        {item.label}
                      </span>
                      {renderBadge(item.href)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function UtilityLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="space-y-1 border-t border-gray-100 px-3 py-3">
      {UTILITY_LINKS.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon
              name={item.icon}
              className={`h-[18px] w-[18px] ${
                active ? 'text-brand-600' : 'text-gray-400'
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [drawer, setDrawer] = useState(false);
  const [bump, setBump] = useState(0);

  const allPages = [
    ...NAV_GROUPS.flatMap((group) => group.items),
    ...UTILITY_LINKS,
  ];

  const meta = allPages.find((item) => item.href === pathname);

  const { data } = useApi<{ summary: { unread: number } }>('/alerts', {
    pageSize: 1,
    at: `${pathname}-${bump}`,
  });

  const { data: requestSummary } = useApi<{
    incoming: { PENDING: number };
  }>('/transfer-requests/summary');

  useEffect(() => {
    const on = () => setBump((b) => b + 1);

    window.addEventListener('pharmacycle:alerts-changed', on);

    return () =>
      window.removeEventListener('pharmacycle:alerts-changed', on);
  }, []);

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    if (!drawer) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
    };

    document.addEventListener('keydown', onKey);

    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  if (session?.kind !== 'pharmacy') return null;

  const { pharmacy, user } = session;

  const unread = data?.summary.unread ?? 0;

  const badges = {
    requests: requestSummary?.incoming.PENDING ?? 0,
    alerts: unread,
  };

  const subtitle =
    pathname === '/dashboard'
      ? `Welcome back, ${pharmacy.name}`
      : meta?.subtitle ?? 'Manage your pharmacy workspace.';

  const title =
    pathname === '/dashboard'
      ? 'Dashboard'
      : meta?.title ?? 'PharmaCycle.AI';

  const logout = () => {
    signOut();
    router.replace('/login');
  };

  const bell = (
    <Link
      href="/alerts"
      aria-label={unread ? `Alerts, ${unread} unread` : 'Alerts'}
      className="relative rounded-xl p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-600"
    >
      <Icon name="bell" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );

  const profile = (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
        {initials(pharmacy.name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {pharmacy.name}
        </p>
        <p className="text-[11px] text-gray-400">
          {user.role || 'Pharmacist'}
        </p>
      </div>

      <button
        onClick={logout}
        title="Sign out"
        aria-label="Sign out"
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        <Icon name="logout" className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex items-center border-b border-gray-100 px-5 pb-4 pt-5">
          <BrandMark size="sm" />
        </div>

        <NavList badges={badges} />

        <UtilityLinks />

        <div className="border-t border-gray-100 px-4 py-3">
          {profile}
        </div>
      </aside>

      {/* Mobile navigation */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
              <BrandMark size="sm" />

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <NavList
              onNavigate={() => setDrawer(false)}
              badges={badges}
            />

            <UtilityLinks onNavigate={() => setDrawer(false)} />

            <div className="border-t border-gray-100 px-4 py-3">
              {profile}
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-3 lg:hidden">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            aria-expanded={drawer}
          >
            <Icon name="menu" />
          </button>

          <div className="absolute left-1/2 -translate-x-1/2">
            <BrandMark size="sm" />
          </div>

          {bell}
        </header>

        {/* Desktop header */}
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-gray-200 bg-white px-6 lg:flex">
          <div>
            <p className="truncate text-xl font-bold text-gray-900">
              {title}
            </p>
            <p className="-mt-0.5 truncate text-sm text-gray-500">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {pathname === '/inventory' && (
              <Link
                href="/inventory?add=1"
                onClick={() =>
                  window.dispatchEvent(
                    new Event('pharmacycle:open-inventory-add')
                  )
                }
                className="btn btn-primary"
              >
                <Icon name="plus" className="h-4 w-4" />
                Add Medicine
              </Link>
            )}

            {bell}

            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {initials(pharmacy.name)}
              </span>

              <div className="leading-tight">
                <p className="text-sm font-medium text-gray-900">
                  {pharmacy.name}
                </p>
                <p className="text-[11px] text-gray-400">
                  {pharmacy.city}, {pharmacy.state}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {pharmacy.verificationStatus === 'PENDING' && (
            <div className="mb-5">
              <Notice tone="orange">
                <strong>Awaiting verification.</strong> You can manage
                inventory and use the scanner now. Transfers, and your
                visibility to other pharmacies and shoppers, switch on once
                PharmaCycle.AI verifies your pharmacy.
              </Notice>
            </div>
          )}

          {pharmacy.verificationStatus === 'REJECTED' && (
            <div className="mb-5">
              <Notice tone="red">
                <strong>Verification was not approved.</strong> Transfers
                stay disabled. Contact support to resolve this.
              </Notice>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
