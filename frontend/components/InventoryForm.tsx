'use client';
import { useState } from 'react';
import { apiUpload, api, errorMessage, fieldErrors } from '@/lib/api';
import { FORMS } from '@/lib/format';
import type { AppConfig, InventoryItem } from '@/lib/types';
import { Field, Notice } from './ui';

export type FormValues = {
  name: string; category: string; dosageForm: string; strength: string; batchNumber: string; nafdacRegNo: string;
  quantity: string; costPrice: string; sellingPrice: string; expiryDate: string;
};

export const EMPTY_FORM: FormValues = { name: '', category: '', dosageForm: 'Tablet', strength: '', batchNumber: '', nafdacRegNo: '', quantity: '', costPrice: '', sellingPrice: '', expiryDate: '' };

export const itemToForm = (i: InventoryItem): FormValues => ({
  name: i.medicine.name, category: i.medicine.category, dosageForm: i.medicine.dosageForm, strength: i.medicine.strength,
  batchNumber: i.batchNumber, nafdacRegNo: i.nafdacRegNo ?? '', quantity: String(i.quantity), costPrice: String(i.costPrice),
  sellingPrice: String(i.sellingPrice), expiryDate: i.expiryDate.slice(0, 10),
});

const CATEGORIES = ['Antibiotic', 'Analgesic', 'Antimalarial', 'Antihypertensive', 'Antidiabetic', 'Antihistamine', 'Gastrointestinal', 'Respiratory', 'Supplement', 'Other'];

export function InventoryForm({ item, prefill, source = 'manual', config, submitLabel, onSaved, onCancel }: {
  item?: InventoryItem; prefill?: Partial<FormValues>; source?: 'manual' | 'scan'; config?: AppConfig | null;
  submitLabel?: string; onSaved: (saved: InventoryItem) => void; onCancel?: () => void;
}) {
  const [f, setF] = useState<FormValues>(() => (item ? itemToForm(item) : { ...EMPTY_FORM, ...prefill }));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const set = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const cls = (k: string) => `input ${errs[k] ? 'input-error' : ''}`;
  const todayIso = new Date().toISOString().slice(0, 10);

  function validate() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = 'Enter the medicine name.';
    if (f.category.trim().length < 2) e.category = 'Enter a category.';
    if (!f.strength.trim()) e.strength = 'Enter the strength, e.g. 500mg.';
    if (!f.batchNumber.trim()) e.batchNumber = 'Enter the batch number.';
    if (f.quantity === '' || !Number.isInteger(Number(f.quantity)) || Number(f.quantity) < 0) e.quantity = 'Enter a whole number, 0 or more.';
    if (f.costPrice === '' || Number(f.costPrice) < 0 || Number.isNaN(Number(f.costPrice))) e.costPrice = 'Enter a price, 0 or more.';
    if (f.sellingPrice === '' || Number(f.sellingPrice) < 0 || Number.isNaN(Number(f.sellingPrice))) e.sellingPrice = 'Enter a price, 0 or more.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.expiryDate)) e.expiryDate = 'Pick the expiry date.';
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const local = validate();
    if (Object.keys(local).length) return setErrs(local);
    setBusy(true);
    setErrs({});
    setError('');
    try {
      const body = { ...f, name: f.name.trim(), category: f.category.trim(), strength: f.strength.trim(), batchNumber: f.batchNumber.trim(), nafdacRegNo: f.nafdacRegNo.trim() };
      let saved = item
        ? await api<InventoryItem>(`/inventory/${item.id}`, { method: 'PATCH', auth: true, body })
        : await api<InventoryItem>('/inventory', { method: 'POST', auth: true, body: { ...body, source } });
      if (photo && config?.imageUploads) saved = await apiUpload<InventoryItem>(`/inventory/${saved.id}/image`, photo);
      onSaved(saved);
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Medicine name" htmlFor="f-name" error={errs.name}><input id="f-name" className={cls('name')} value={f.name} onChange={set('name')} /></Field>
        <Field label="Strength" htmlFor="f-strength" error={errs.strength}><input id="f-strength" className={cls('strength')} placeholder="500mg" value={f.strength} onChange={set('strength')} /></Field>
        <Field label="Dosage form" htmlFor="f-form" error={errs.dosageForm}>
          <select id="f-form" className={cls('dosageForm')} value={f.dosageForm} onChange={set('dosageForm')}>{FORMS.map((x) => <option key={x}>{x}</option>)}</select>
        </Field>
        <Field label="Category" htmlFor="f-category" error={errs.category}>
          <input id="f-category" list="f-categories" className={cls('category')} value={f.category} onChange={set('category')} />
          <datalist id="f-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Batch number" htmlFor="f-batch" error={errs.batchNumber}><input id="f-batch" className={cls('batchNumber')} value={f.batchNumber} onChange={set('batchNumber')} /></Field>
        <Field label="NAFDAC reg. no. (optional)" htmlFor="f-nafdac" error={errs.nafdacRegNo} hint="Saved exactly as printed. It is not checked against the NAFDAC register."><input id="f-nafdac" className={cls('nafdacRegNo')} value={f.nafdacRegNo} onChange={set('nafdacRegNo')} /></Field>
        <Field label="Quantity (units)" htmlFor="f-qty" error={errs.quantity}><input id="f-qty" type="number" inputMode="numeric" min={0} step={1} className={cls('quantity')} value={f.quantity} onChange={set('quantity')} /></Field>
        <Field label="Expiry date" htmlFor="f-expiry" error={errs.expiryDate}><input id="f-expiry" type="date" className={cls('expiryDate')} value={f.expiryDate} onChange={set('expiryDate')} /></Field>
        <Field label="Cost price (₦ per unit)" htmlFor="f-cost" error={errs.costPrice}><input id="f-cost" type="number" inputMode="decimal" min={0} step="0.01" className={cls('costPrice')} value={f.costPrice} onChange={set('costPrice')} /></Field>
        <Field label="Selling price (₦ per unit)" htmlFor="f-sell" error={errs.sellingPrice}><input id="f-sell" type="number" inputMode="decimal" min={0} step="0.01" className={cls('sellingPrice')} value={f.sellingPrice} onChange={set('sellingPrice')} /></Field>
      </div>
      {f.expiryDate && f.expiryDate < todayIso && <Notice tone="orange">This date has passed, so the item will be saved as Expired.</Notice>}
      {item && config?.imageUploads && (
        <Field label="Photo (optional)" htmlFor="f-photo" hint="JPEG, PNG or WebP, up to 4 MB.">
          <input id="f-photo" type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </Field>
      )}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel || (item ? 'Save changes' : 'Add medicine')}</button>
      </div>
    </form>
  );
}
