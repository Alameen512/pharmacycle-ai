
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { InventoryForm, type FormValues } from '@/components/InventoryForm';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState, Icon, Notice, PageCard, Spinner } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { AppConfig, InventoryItem, Pagination } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Mode = 'text' | 'barcode';

const MAX_B64 = 3_500_000;

const KNOWN = [
  'Amoxicillin', 'Paracetamol', 'Ibuprofen', 'Metformin',
  'Amlodipine', 'Ciprofloxacin', 'Azithromycin', 'Metronidazole',
  'Omeprazole', 'Cetirizine', 'Loratadine', 'Artemether',
  'Lumefantrine', 'Diclofenac', 'Salbutamol', 'Vitamin C',
];

const FORM_WORDS: [RegExp, string][] = [
  [/tablet/i, 'Tablet'],
  [/capsule/i, 'Capsule'],
  [/syrup/i, 'Syrup'],
  [/suspension/i, 'Suspension'],
  [/injection/i, 'Injection'],
  [/cream/i, 'Cream'],
  [/ointment/i, 'Ointment'],
  [/drops/i, 'Drops'],
  [/inhaler/i, 'Inhaler'],
];

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

function lastDay(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(
    new Date(Date.UTC(y, m, 0)).getUTCDate()
  ).padStart(2, '0')}`;
}

function parseExpiry(text: string): string {
  const t = text.replace(/\s+/g, ' ');
  const labelled =
    /(?:EXP(?:IRY)?\.?(?: DATE)?|USE BEFORE|BEST BEFORE)\s*[:\-]?\s*([^A-Za-z]{0,3}[A-Za-z0-9\/\.\- ]{4,12})/i.exec(t)?.[1] ?? t;

  let m = /\b(0?[1-9]|1[0-2])\s*[\/.\-]\s*(20\d{2}|\d{2})\b/.exec(labelled);

  if (m) {
    return lastDay(
      m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]),
      Number(m[1])
    );
  }

  m = new RegExp(
    `\\b(${MONTHS.join('|')})[a-z]*\\.?\\s*[\\-/ ]?\\s*(20\\d{2}|\\d{2})\\b`,
    'i'
  ).exec(labelled);

  if (m) {
    return lastDay(
      m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]),
      MONTHS.indexOf(m[1].toLowerCase()) + 1
    );
  }

  return '';
}

function parseLabel(text: string): Partial<FormValues> {
  const out: Partial<FormValues> = {};

  const name = KNOWN.find((k) => new RegExp(k, 'i').test(text));
  if (name) out.name = name;

  const strength =
    /\b(\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu)(?:\s?\/\s?\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml))?)\b/i.exec(text)?.[1];

  if (strength) out.strength = strength.replace(/\s+/g, '');

  const form = FORM_WORDS.find(([re]) => re.test(text));
  if (form) out.dosageForm = form[1];

  const batch =
    /\b(?:BATCH|B\.?\s?NO|LOT)\.?\s*(?:NO|NUMBER)?\.?\s*[:#.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{2,19})/i.exec(text)?.[1];

  if (batch) out.batchNumber = batch.toUpperCase();

  const naf = /\b([A-Z0-9]{1,2}-\d{3,6})\b/.exec(text.toUpperCase())?.[1];
  if (naf) out.nafdacRegNo = naf;

  const exp = parseExpiry(text);
  if (exp) out.expiryDate = exp;

  return out;
}

function downscale(src: CanvasImageSource, w: number, h: number): string {
  let max = 1280;
  let quality = 0.8;

  for (let i = 0; i < 6; i++) {
    const scale = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas');

    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);

    c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);

    const url = c.toDataURL('image/jpeg', quality);

    if (url.length - 23 <= MAX_B64) return url;

    max = Math.round(max * 0.75);
    quality = Math.max(0.5, quality - 0.1);
  }

  throw new Error('That image is too large to process. Try a closer, smaller photo.');
}

export default function ScanPage() {
  const toast = useToast();

  const cfg = useApi<AppConfig>('/config');
  const recent = useApi<{ items: InventoryItem[]; pagination: Pagination }>(
    '/inventory',
    { source: 'scan', pageSize: 5 }
  );

  const [mode, setMode] = useState<Mode>('text');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [camOn, setCamOn] = useState(false);
  const [camMsg, setCamMsg] = useState('');
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [engine, setEngine] = useState('');
  const [ocrMsg, setOcrMsg] = useState('');
  const [form, setForm] = useState<{
    key: number;
    prefill: Partial<FormValues>;
  } | null>(null);
  const [code, setCode] = useState('');
  const [matches, setMatches] = useState<InventoryItem[] | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef(0);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(loopRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function lookup(value: string) {
    setBusy('lookup');
    setMatches(null);

    try {
      const r = await api<{ items: InventoryItem[] }>('/inventory/lookup', {
        auth: true,
        query: { code: value },
      });

      setMatches(r.items);
      setCode(value);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy('');
    }
  }

  async function startCamera(nextFacing = facing) {
    setCamMsg('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamMsg(
        'This browser cannot open the camera. Upload a photo or enter the details by hand.'
      );
      return;
    }

    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
      });

      streamRef.current = stream;
      setCamOn(true);
      setImage('');

      requestAnimationFrame(async () => {
        if (!videoRef.current) return;

        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);

        if (mode === 'barcode') startDetect();
      });
    } catch (e) {
      setCamMsg(
        (e as DOMException).name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow it in your browser settings, or upload a photo instead.'
          : 'Could not start the camera. Upload a photo or enter the details by hand.'
      );
    }
  }

  function startDetect() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) return;

    const det = new Detector();
    let last = 0;

    const tick = async (t: number) => {
      if (!streamRef.current || !videoRef.current) return;

      if (t - last > 300 && videoRef.current.readyState >= 2) {
        last = t;

        try {
          const found = await det.detect(videoRef.current);

          if (found.length) {
            stopCamera();
            return void lookup(found[0].rawValue);
          }
        } catch {
          // Keep scanning.
        }
      }

      loopRef.current = requestAnimationFrame(tick);
    };

    loopRef.current = requestAnimationFrame(tick);
  }

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;

    try {
      setImage(downscale(v, v.videoWidth, v.videoHeight));
      stopCamera();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return toast.error('Choose a JPEG, PNG or WebP image.');
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        stopCamera();
        setImage(downscale(img, img.naturalWidth, img.naturalHeight));
      } catch (err) {
        toast.error((err as Error).message);
      }

      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error('That file could not be read as an image.');
    };

    img.src = url;
  }

  async function readLabel() {
    setBusy('ocr');
    setOcrMsg('');
    setEngine('');
    setProgress(0);

    const b64 = image.split(',')[1];

    try {
      const r = await api<{ fields: Record<string, string | null> }>(
        '/inventory/ocr',
        {
          method: 'POST',
          auth: true,
          body: { image: b64, mimeType: 'image/jpeg' },
        }
      );

      const prefill: Partial<FormValues> = {};

      for (const [k, v] of Object.entries(r.fields)) {
        if (v) (prefill as unknown as Record<string, string>)[k] = v;
      }

      setEngine('Read by the server’s OCR service.');
      setForm({ key: Date.now(), prefill });
    } catch (serverErr) {
      try {
        const { createWorker } = await import('tesseract.js');

        const worker = await createWorker('eng', 1, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        });

        const { data } = await worker.recognize(image);
        await worker.terminate();

        const prefill = parseLabel(data.text);

        setEngine('Read in your browser (less accurate than server OCR).');
        setOcrMsg(
          Object.keys(prefill).length
            ? ''
            : 'Nothing could be read confidently. Fill in the details by hand.'
        );

        setForm({ key: Date.now(), prefill });
      } catch {
        setOcrMsg(
          `${errorMessage(serverErr)} The in-browser reader also failed, so please enter the details by hand.`
        );
        setForm({ key: Date.now(), prefill: {} });
      }
    } finally {
      setBusy('');
    }
  }

  function reset() {
    stopCamera();
    setImage('');
    setForm(null);
    setMatches(null);
    setCode('');
    setEngine('');
    setOcrMsg('');
    setCamMsg('');
  }

  const barcodeSupported =
    typeof window !== 'undefined' && 'BarcodeDetector' in window;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-700">
              <Icon name="camera" className="h-4 w-4" />
              INVENTORY SCANNER
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
              Add stock without the busywork.
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
              Scan a medicine label, look up a barcode or enter the details
              yourself. Check everything before saving it to your inventory.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
              <Icon name="checkCircle" className="h-4 w-4 text-green-600" />
              Review before saving
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
              <Icon name="package" className="h-4 w-4 text-brand-600" />
              Inventory linked
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50/70">
          {[
            ['01', 'Capture'],
            ['02', 'Review details'],
            ['03', 'Save stock'],
          ].map(([number, label]) => (
            <div key={number} className="flex items-center justify-center gap-2 px-2 py-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-700 ring-1 ring-gray-200">
                {number}
              </span>
              <span className="text-xs font-medium text-gray-600 sm:text-sm">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Scan medicine
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Choose how you want to capture the medicine details.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Scan method"
              className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1"
            >
              {([
                ['text', 'Read label'],
                ['barcode', 'Barcode'],
              ] as [Mode, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={mode === key}
                  onClick={() => {
                    reset();
                    setMode(key);
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    mode === key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!form && (
            <PageCard
              title={mode === 'text' ? 'Capture medicine label' : 'Barcode lookup'}
            >
              <div className="space-y-5 p-4 sm:p-5">
                {mode === 'text' ? (
                  <div className="rounded-xl bg-brand-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-white p-2 text-brand-700 shadow-sm">
                        <Icon name="camera" className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Get a clear photo of the medicine pack
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-600">
                          Make sure the medicine name, strength, batch number
                          and expiry date are visible and well lit.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Notice>
                    Barcode lookup only matches batch or NAFDAC numbers already
                    saved in <em>your</em> inventory. It does not look anything
                    up in a national register.
                    {!barcodeSupported &&
                      ' This browser cannot read barcodes from the camera, so type the code below.'}
                  </Notice>
                )}

                <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-950">
                  {camOn ? (
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="aspect-video w-full object-cover"
                    />
                  ) : image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt="Captured medicine label preview"
                      className="aspect-video w-full object-contain"
                    />
                  ) : (
                    <div className="flex aspect-video flex-col items-center justify-center px-6 text-center">
                      <div className="mb-3 rounded-2xl bg-white/10 p-4 text-white">
                        <Icon
                          name={mode === 'text' ? 'camera' : 'package'}
                          className="h-8 w-8"
                        />
                      </div>
                      <p className="text-sm font-medium text-white">
                        {mode === 'text'
                          ? 'Your camera preview will appear here'
                          : 'Point your camera at a barcode'}
                      </p>
                      <p className="mt-1 max-w-xs text-xs leading-5 text-gray-400">
                        {mode === 'text'
                          ? 'You can also upload an existing photo or enter the details manually.'
                          : 'You can also type or paste the batch or NAFDAC number.'}
                      </p>
                    </div>
                  )}
                </div>

                {camMsg && (
                  <p role="alert" className="text-sm text-red-700">
                    {camMsg}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {!camOn ? (
                    mode === 'text' || barcodeSupported ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => startCamera()}
                      >
                        <Icon name="camera" className="h-4 w-4" />
                        Start camera
                      </button>
                    ) : null
                  ) : (
                    <>
                      {mode === 'text' && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={capture}
                        >
                          <Icon name="camera" className="h-4 w-4" />
                          Capture photo
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          const next =
                            facing === 'environment' ? 'user' : 'environment';
                          setFacing(next);
                          void startCamera(next);
                        }}
                      >
                        Switch to {facing === 'environment' ? 'front' : 'back'} camera
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={stopCamera}
                      >
                        Stop camera
                      </button>
                    </>
                  )}

                  {mode === 'text' && (
                    <label className="btn btn-secondary cursor-pointer">
                      <Icon name="upload" className="h-4 w-4" />
                      Upload photo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={onFile}
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setForm({ key: Date.now(), prefill: {} })
                    }
                  >
                    Enter manually
                  </button>
                </div>

                {mode === 'text' && image && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Photo ready
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Read the label to prefill the inventory form.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary shrink-0"
                        onClick={readLabel}
                        disabled={busy === 'ocr'}
                      >
                        {busy === 'ocr' ? (
                          <>
                            <Spinner className="h-4 w-4" />
                            Reading label
                            {progress ? ` (${progress}%)` : '…'}
                          </>
                        ) : (
                          <>
                            <Icon name="check" className="h-4 w-4" />
                            Read label details
                          </>
                        )}
                      </button>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-gray-500">
                      {cfg.data?.serverOcr
                        ? 'Server OCR is on; the photo is sent to the OCR provider.'
                        : 'Server OCR is not configured, so the photo is read in your browser. The first read downloads the reader and can take a while.'}
                    </p>
                  </div>
                )}

                {mode === 'barcode' && (
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (code.trim()) void lookup(code.trim());
                    }}
                  >
                    <label
                      htmlFor="inventory-code"
                      className="text-sm font-medium text-gray-700"
                    >
                      Batch or NAFDAC number
                    </label>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id="inventory-code"
                        aria-label="Batch or NAFDAC number"
                        className="input min-w-0 flex-1"
                        placeholder="Enter or paste a code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                      />

                      <button
                        type="submit"
                        className="btn btn-primary shrink-0"
                        disabled={busy === 'lookup' || !code.trim()}
                      >
                        {busy === 'lookup' ? (
                          <>
                            <Spinner className="h-4 w-4" />
                            Searching…
                          </>
                        ) : (
                          <>
                            <Icon name="search" className="h-4 w-4" />
                            Look up
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {matches && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Lookup results
                      </h3>
                      <span className="text-xs text-gray-500">
                        {matches.length} match{matches.length === 1 ? '' : 'es'}
                      </span>
                    </div>

                    {matches.length ? (
                      <ul className="divide-y divide-gray-100">
                        {matches.map((m) => (
                          <li
                            key={m.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">
                                {m.medicine.name} {m.medicine.strength}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Batch {m.batchNumber} · {m.quantity} in stock
                                {' · '}Expires {formatDate(m.expiryDate)}
                              </p>
                            </div>
                            <StatusBadge status={m.status} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          No item in your inventory has the batch or NAFDAC
                          number “{code}”.
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            setForm({
                              key: Date.now(),
                              prefill: { batchNumber: code },
                            })
                          }
                        >
                          Add it as new stock
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </PageCard>
          )}

          {form && (
            <PageCard
              title="Review medicine details"
              action={
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={reset}
                >
                  Start over
                </button>
              }
            >
              <div className="space-y-4 p-4 sm:p-5">
                <div className="rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">
                  Check every field against the medicine pack before saving.
                  Scanned information may not always be accurate.
                </div>

                {engine && (
                  <p className="text-xs text-gray-500">{engine}</p>
                )}

                {ocrMsg && <Notice tone="orange">{ocrMsg}</Notice>}

                <InventoryForm
                  key={form.key}
                  prefill={form.prefill}
                  source="scan"
                  config={cfg.data}
                  submitLabel="Save to inventory"
                  onCancel={reset}
                  onSaved={(s) => {
                    toast.success(`${s.medicine.name} saved to inventory.`);
                    reset();
                    recent.reload();
                  }}
                />
              </div>
            </PageCard>
          )}
        </div>

        <div className="min-w-0">
          <PageCard title="Recently scanned">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-xs leading-5 text-gray-500">
                Your latest inventory items added through the scanning workflow.
              </p>
            </div>

            {recent.loading && !recent.data ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-gray-500">
                <Spinner className="h-4 w-4" />
                Loading recent items…
              </div>
            ) : !recent.data?.items.length ? (
              <EmptyState
                title="Nothing scanned yet"
                body="Items you save from this page will appear here."
              />
            ) : (
              <ul className="divide-y divide-gray-100">
                {recent.data.items.map((i) => (
                  <li key={i.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-brand-50 p-2 text-brand-700">
                        <Icon name="package" className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {i.medicine.name} {i.medicine.strength}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Batch {i.batchNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {i.quantity} units · Expires {formatDate(i.expiryDate)}
                        </p>
                        <div className="mt-2">
                          <StatusBadge status={i.status} />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PageCard>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Icon name="alert" className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-gray-900">
                Important reminder
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-gray-600">
              Always verify the medicine name, strength, batch number and
              expiry date on the original pack. Scanning is an assistant,
              not a substitute for checking the label.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
