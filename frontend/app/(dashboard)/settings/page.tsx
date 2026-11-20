
'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  ErrorState,
  Field,
  LoadingBlock,
  Notice,
  PageCard,
  Toggle,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, errorMessage, fieldErrors } from '@/lib/api';
import { NIGERIAN_STATES } from '@/lib/format';
import type { AppConfig, Verification } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Prefs = {
  alertNearExpiry: boolean;
  alertLowStock: boolean;
  alertTransfer: boolean;
  emailTransfer: boolean;
  emailStock: boolean;
};

type Profile = {
  pharmacy: {
    name: string;
    address: string;
    city: string;
    state: string;
    phone: string | null;
    lat: number | null;
    lng: number | null;
    verificationStatus: Verification;
  };
  user: {
    name: string;
    email: string;
    role: string;
  };
  preferences: Prefs;
};

const PREF_ROWS: {
  key: keyof Prefs;
  label: string;
  description: string;
}[] = [
  {
    key: 'alertNearExpiry',
    label: 'Expiry alerts',
    description: 'In-app alerts for near-expiry and expired stock.',
  },
  {
    key: 'alertLowStock',
    label: 'Low-stock alerts',
    description: 'In-app alerts when items run low or out.',
  },
  {
    key: 'alertTransfer',
    label: 'Transfer alerts',
    description: 'In-app alerts for requests and updates on your transfers.',
  },
  {
    key: 'emailTransfer',
    label: 'Transfer email notifications',
    description: 'Email admin users when a transfer needs attention.',
  },
  {
    key: 'emailStock',
    label: 'Daily stock alert summary',
    description: 'One email after each daily check that finds new alerts.',
  },
];

export default function SettingsPage() {
  const { refresh } = useAuth();
  const toast = useToast();

  const {
    data,
    error,
    loading,
    reload,
  } = useApi<Profile>('/pharmacy/profile');

  const cfg = useApi<AppConfig>('/config');

  const [f, setF] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    lat: '',
    lng: '',
    contactName: '',
  });

  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const isAdmin = data?.user.role === 'ADMIN';

  useEffect(() => {
    if (!data) return;

    const p = data.pharmacy;

    setF({
      name: p.name,
      address: p.address,
      city: p.city,
      state: p.state,
      phone: p.phone ?? '',
      lat: p.lat?.toString() ?? '',
      lng: p.lng?.toString() ?? '',
      contactName: data.user.name,
    });

    setPrefs(data.preferences);
  }, [data]);

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setF((p) => ({ ...p, [k]: e.target.value }));
    };

  const cls = (k: string) =>
    `input ${errs[k] ? 'input-error' : ''}`;

  async function save(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setErrs({});

    try {
      await api('/pharmacy/profile', {
        method: 'PATCH',
        auth: true,
        body: {
          ...f,
          preferences: prefs,
        },
      });

      toast.success('Settings saved.');

      await refresh();
      reload();
    } catch (err) {
      setErrs(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return <LoadingBlock />;
  }

  if (error || !data || !prefs) {
    return (
      <div className="card">
        <ErrorState
          message={error || 'Could not load settings.'}
          onRetry={reload}
        />
      </div>
    );
  }

  const verification = data.pharmacy.verificationStatus;

  const verificationLabel =
    verification === 'VERIFIED'
      ? 'Verified'
      : verification === 'PENDING'
        ? 'Awaiting verification'
        : 'Not verified';

  const verificationTone =
    verification === 'VERIFIED'
      ? 'green'
      : verification === 'PENDING'
        ? 'orange'
        : 'red';

  return (
    <form onSubmit={save} className="space-y-6">
      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold text-brand-700">
              ACCOUNT PREFERENCES
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
              Settings
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
              Manage your pharmacy profile, account information and how
              PharmaCycle keeps you informed.
            </p>
          </div>

          <Badge tone={verificationTone}>
            {verificationLabel}
          </Badge>
        </div>
      </section>

      {!isAdmin && (
        <Notice tone="orange">
          You are viewing these settings in read-only mode. Only an admin
          user can make changes to the pharmacy profile and notification
          preferences.
        </Notice>
      )}

      <PageCard
        title="Pharmacy information"
        action={
          <Badge tone={verificationTone}>
            {verificationLabel}
          </Badge>
        }
      >
        <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-3">
          <p className="text-xs leading-5 text-gray-500">
            Keep your pharmacy details accurate so other verified pharmacies
            can identify and contact you.
          </p>
        </div>

        <fieldset
          disabled={!isAdmin || busy}
          className="grid gap-4 p-5 sm:grid-cols-2"
        >
          <Field
            label="Pharmacy name"
            htmlFor="s-name"
            error={errs.name}
          >
            <input
              id="s-name"
              className={cls('name')}
              value={f.name}
              onChange={set('name')}
            />
          </Field>

          <Field
            label="Contact person"
            htmlFor="s-contact"
            error={errs.contactName}
          >
            <input
              id="s-contact"
              className={cls('contactName')}
              value={f.contactName}
              onChange={set('contactName')}
            />
          </Field>

          <Field
            label="Street address"
            htmlFor="s-address"
            error={errs.address}
          >
            <input
              id="s-address"
              className={cls('address')}
              value={f.address}
              onChange={set('address')}
            />
          </Field>

          <Field
            label="Phone number"
            htmlFor="s-phone"
            error={errs.phone}
          >
            <input
              id="s-phone"
              type="tel"
              className={cls('phone')}
              value={f.phone}
              onChange={set('phone')}
            />
          </Field>

          <Field
            label="City"
            htmlFor="s-city"
            error={errs.city}
          >
            <input
              id="s-city"
              className={cls('city')}
              value={f.city}
              onChange={set('city')}
            />
          </Field>

          <Field
            label="State"
            htmlFor="s-state"
            error={errs.state}
          >
            <select
              id="s-state"
              className={cls('state')}
              value={f.state}
              onChange={set('state')}
            >
              {NIGERIAN_STATES.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-900">
                Location coordinates
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Optional. Used to sort pharmacies and search results by
                distance.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Latitude"
                htmlFor="s-lat"
                error={errs.lat}
              >
                <input
                  id="s-lat"
                  inputMode="decimal"
                  className={cls('lat')}
                  placeholder="e.g. 6.5244"
                  value={f.lat}
                  onChange={set('lat')}
                />
              </Field>

              <Field
                label="Longitude"
                htmlFor="s-lng"
                error={errs.lng}
              >
                <input
                  id="s-lng"
                  inputMode="decimal"
                  className={cls('lng')}
                  placeholder="e.g. 3.3792"
                  value={f.lng}
                  onChange={set('lng')}
                />
              </Field>
            </div>
          </div>
        </fieldset>
      </PageCard>

      <PageCard title="Account information">
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <span className="text-sm font-bold">
                {data.user.name.trim().charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-gray-900">
                {data.user.name}
              </p>
              <p className="mt-1 break-all text-sm text-gray-500">
                {data.user.email}
              </p>
              <div className="mt-2">
                <Badge tone="blue">
                  {data.user.role === 'ADMIN' ? 'Pharmacy admin' : 'Team member'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs leading-5 text-gray-600">
              Your login email and account role are managed separately.
              Contact your platform administrator if either needs to be
              changed.
            </p>
          </div>
        </div>
      </PageCard>

      <PageCard title="Notification preferences">
        <div className="space-y-4 p-5">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              In-app notifications
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Choose which activity should appear in your PharmaCycle alerts.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {PREF_ROWS.slice(0, 3).map((row) => (
              <Toggle
                key={row.key}
                label={row.label}
                description={row.description}
                checked={prefs[row.key]}
                disabled={!isAdmin || busy}
                onChange={(value) =>
                  setPrefs({ ...prefs, [row.key]: value })
                }
              />
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-900">
              Email notifications
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Choose which updates should also be sent to your registered
              email address.
            </p>
          </div>

          {cfg.data && !cfg.data.email && (
            <Notice tone="orange">
              Email delivery is not configured on this server. Your email
              preferences can still be saved, but emails cannot be sent
              until an administrator configures the service. In-app alerts
              continue to work.
            </Notice>
          )}

          <div className="divide-y divide-gray-100">
            {PREF_ROWS.slice(3).map((row) => (
              <Toggle
                key={row.key}
                label={row.label}
                description={row.description}
                checked={prefs[row.key]}
                disabled={!isAdmin || busy}
                onChange={(value) =>
                  setPrefs({ ...prefs, [row.key]: value })
                }
              />
            ))}
          </div>

          <p className="border-t border-gray-100 pt-3 text-xs leading-5 text-gray-500">
            These preferences are stored on the server and applied whenever
            alerts and emails are created.
          </p>
        </div>
      </PageCard>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          Changes are applied after you save your settings.
        </p>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isAdmin || busy}
        >
          {busy ? 'Saving changes…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
