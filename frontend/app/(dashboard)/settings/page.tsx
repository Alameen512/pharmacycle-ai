'use client';
import { useEffect, useState } from 'react';
import { Badge, ErrorState, Field, LoadingBlock, Notice, PageCard, Toggle } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, errorMessage, fieldErrors } from '@/lib/api';
import { NIGERIAN_STATES } from '@/lib/format';
import type { AppConfig, Verification } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Prefs = { alertNearExpiry: boolean; alertLowStock: boolean; alertTransfer: boolean; emailTransfer: boolean; emailStock: boolean };
type Profile = {
  pharmacy: { name: string; address: string; city: string; state: string; phone: string | null; lat: number | null; lng: number | null; verificationStatus: Verification };
  user: { name: string; email: string; role: string };
  preferences: Prefs;
};

const PREF_ROWS: { key: keyof Prefs; label: string; description: string }[] = [
  { key: 'alertNearExpiry', label: 'Expiry alerts', description: 'In-app alerts for near-expiry and expired stock.' },
  { key: 'alertLowStock', label: 'Low-stock alerts', description: 'In-app alerts when items run low or out.' },
  { key: 'alertTransfer', label: 'Transfer alerts', description: 'In-app alerts for requests and updates on your transfers.' },
  { key: 'emailTransfer', label: 'Email me about transfers', description: 'Sent to admin users when a transfer needs attention.' },
  { key: 'emailStock', label: 'Email me a stock alert summary', description: 'One email after each daily check that finds new alerts.' },
];

export default function SettingsPage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<Profile>('/pharmacy/profile');
  const cfg = useApi<AppConfig>('/config');
  const [f, setF] = useState({ name: '', address: '', city: '', state: '', phone: '', lat: '', lng: '', contactName: '' });
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const isAdmin = data?.user.role === 'ADMIN';

  useEffect(() => {
    if (!data) return;
    const p = data.pharmacy;
    setF({ name: p.name, address: p.address, city: p.city, state: p.state, phone: p.phone ?? '', lat: p.lat?.toString() ?? '', lng: p.lng?.toString() ?? '', contactName: data.user.name });
    setPrefs(data.preferences);
  }, [data]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const cls = (k: string) => `input ${errs[k] ? 'input-error' : ''}`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrs({});
    try {
      await api('/pharmacy/profile', { method: 'PATCH', auth: true, body: { ...f, preferences: prefs } });
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

  if (loading && !data) return <LoadingBlock />;
  if (error || !data || !prefs) return <div className="card"><ErrorState message={error || 'Could not load settings.'} onRetry={reload} /></div>;
  const v = data.pharmacy.verificationStatus;

  return (
    <form onSubmit={save} className="space-y-6">
      {!isAdmin && <Notice tone="orange">Only an admin user can change these settings.</Notice>}
      <PageCard title="Pharmacy profile" action={<Badge tone={v === 'VERIFIED' ? 'green' : v === 'PENDING' ? 'orange' : 'red'}>{v === 'VERIFIED' ? 'Verified' : v === 'PENDING' ? 'Awaiting verification' : 'Not verified'}</Badge>}>
        <fieldset disabled={!isAdmin || busy} className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Pharmacy name" htmlFor="s-name" error={errs.name}><input id="s-name" className={cls('name')} value={f.name} onChange={set('name')} /></Field>
          <Field label="Contact person" htmlFor="s-contact" error={errs.contactName}><input id="s-contact" className={cls('contactName')} value={f.contactName} onChange={set('contactName')} /></Field>
          <Field label="Street address" htmlFor="s-address" error={errs.address}><input id="s-address" className={cls('address')} value={f.address} onChange={set('address')} /></Field>
          <Field label="Phone" htmlFor="s-phone" error={errs.phone}><input id="s-phone" type="tel" className={cls('phone')} value={f.phone} onChange={set('phone')} /></Field>
          <Field label="City" htmlFor="s-city" error={errs.city}><input id="s-city" className={cls('city')} value={f.city} onChange={set('city')} /></Field>
          <Field label="State" htmlFor="s-state" error={errs.state}><select id="s-state" className={cls('state')} value={f.state} onChange={set('state')}>{NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Latitude (optional)" htmlFor="s-lat" error={errs.lat} hint="Used to sort pharmacies and search results by distance."><input id="s-lat" inputMode="decimal" className={cls('lat')} value={f.lat} onChange={set('lat')} /></Field>
          <Field label="Longitude (optional)" htmlFor="s-lng" error={errs.lng}><input id="s-lng" inputMode="decimal" className={cls('lng')} value={f.lng} onChange={set('lng')} /></Field>
          <p className="text-xs text-gray-500 sm:col-span-2">Login email: {data.user.email}</p>
        </fieldset>
      </PageCard>

      <PageCard title="Notifications">
        <div className="space-y-1 p-5">
          {cfg.data && !cfg.data.email && <div className="mb-3"><Notice tone="orange">Email delivery is not configured on this server. Email preferences are saved, but no emails can be sent until an administrator sets it up. In-app alerts still work.</Notice></div>}
          <div className="divide-y divide-gray-100">
            {PREF_ROWS.map((r) => <Toggle key={r.key} label={r.label} description={r.description} checked={prefs[r.key]} disabled={!isAdmin || busy} onChange={(val) => setPrefs({ ...prefs, [r.key]: val })} />)}
          </div>
          <p className="pt-2 text-xs text-gray-500">These preferences are stored on the server and applied whenever alerts and emails are created.</p>
        </div>
      </PageCard>
      <div className="flex justify-end"><button className="btn btn-primary" disabled={!isAdmin || busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  );
}
