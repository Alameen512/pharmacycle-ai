'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { Field, Icon } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { api, errorMessage, fieldErrors, type ConsumerSession, type PharmacySession } from '@/lib/api';
import { NIGERIAN_STATES } from '@/lib/format';

type Role = 'pharmacy' | 'consumer';

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [role, setRole] = useState<Role>('pharmacy');
  const [f, setF] = useState({ pharmacyName: '', name: '', email: '', password: '', city: '', state: '', address: '', phone: '' });
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const cls = (k: string) => `input ${errs[k] ? 'input-error' : ''}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (role === 'pharmacy' && f.pharmacyName.trim().length < 2) local.pharmacyName = 'Enter the pharmacy name.';
    if (f.name.trim().length < 2) local.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) local.email = 'Enter a valid email address.';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) local.password = 'Use at least 8 characters with a letter and a number.';
    if (role === 'pharmacy') {
      if (f.city.trim().length < 2) local.city = 'Enter a city.';
      if (!f.state) local.state = 'Select a state.';
    }
    if (Object.keys(local).length) return setErrs(local);
    if (!agree) return setError('Please accept the terms and privacy notice to continue.');
    setBusy(true);
    setError('');
    setErrs({});
    try {
      if (role === 'pharmacy') {
        const r = await api<Omit<PharmacySession, 'kind'>>('/auth/register', { method: 'POST', body: { pharmacyName: f.pharmacyName, name: f.name, email: f.email, password: f.password, city: f.city, state: f.state, address: f.address, phone: f.phone } });
        signIn({ kind: 'pharmacy', ...r });
        router.replace('/dashboard');
      } else {
        const r = await api<Omit<ConsumerSession, 'kind'>>('/consumer/auth/register', { method: 'POST', body: { name: f.name, email: f.email, password: f.password, city: f.city, state: f.state } });
        signIn({ kind: 'consumer', ...r });
        router.replace('/search');
      }
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle={role === 'pharmacy' ? 'New pharmacies start unverified. You can set up stock right away; transfers unlock after verification.' : 'Search works without an account. An account saves your default location so search is pre-filled.'}>
      <div role="tablist" aria-label="Account type" className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
        {(['pharmacy', 'consumer'] as Role[]).map((r) => (
          <button key={r} role="tab" aria-selected={role === r} type="button" onClick={() => { setRole(r); setErrs({}); setError(''); }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-600 ${role === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
            {r === 'pharmacy' ? 'Pharmacy' : 'General user'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        {role === 'pharmacy' && (
          <Field label="Pharmacy name" htmlFor="pharmacyName" error={errs.pharmacyName}>
            <input id="pharmacyName" className={cls('pharmacyName')} value={f.pharmacyName} onChange={set('pharmacyName')} autoComplete="organization" />
          </Field>
        )}
        <Field label="Your full name" htmlFor="name" error={errs.name}>
          <input id="name" className={cls('name')} value={f.name} onChange={set('name')} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email" error={errs.email}>
          <input id="email" type="email" className={cls('email')} value={f.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password" error={errs.password} hint="At least 8 characters, with a letter and a number.">
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} className={`${cls('password')} pr-11`} value={f.password} onChange={set('password')} autoComplete="new-password" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500 hover:text-gray-700"><Icon name={show ? 'eyeOff' : 'eye'} className="h-5 w-5" /></button>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={role === 'pharmacy' ? 'City' : 'City (optional)'} htmlFor="city" error={errs.city}>
            <input id="city" className={cls('city')} value={f.city} onChange={set('city')} autoComplete="address-level2" />
          </Field>
          <Field label={role === 'pharmacy' ? 'State' : 'State (optional)'} htmlFor="state" error={errs.state}>
            <select id="state" className={cls('state')} value={f.state} onChange={set('state')}>
              <option value="">Select state</option>
              {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        {role === 'pharmacy' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Street address (optional)" htmlFor="address" error={errs.address}><input id="address" className={cls('address')} value={f.address} onChange={set('address')} autoComplete="street-address" /></Field>
            <Field label="Phone (optional)" htmlFor="phone" error={errs.phone}><input id="phone" type="tel" className={cls('phone')} value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
          </div>
        )}
        <label className="flex items-start gap-2.5 text-sm text-gray-600">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-brand-600" />
          <span>I have read and accept the <Link href="/legal" target="_blank" className="font-medium text-brand-700 underline">terms and privacy notice</Link>.</span>
        </label>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">Already registered? <Link href="/login" className="font-medium text-brand-700 hover:underline">Log in</Link></p>
    </AuthShell>
  );
}
