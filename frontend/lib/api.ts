export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const SESSION_KEY = 'pharmacycle.session';

export type PharmacySession = {
  kind: 'pharmacy';
  token: string;
  user: { id: string; name: string; email: string; role: string };
  pharmacy: { id: string; name: string; city: string; state: string; verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' };
};
export type ConsumerSession = {
  kind: 'consumer';
  token: string;
  consumer: { id: string; name: string; email: string; city: string | null; state: string | null };
};
export type Session = PharmacySession | ConsumerSession;

export function readSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(s: Session | null) {
  try {
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode): session lasts until reload */
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string[]>;
  constructor(message: string, status: number, code?: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;
type Opts = { method?: string; body?: unknown; query?: Query; auth?: boolean; signal?: AbortSignal };

function buildUrl(path: string, query?: Query) {
  const url = new URL(API_URL + path);
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  return url.toString();
}

function authHeader(): Record<string, string> {
  const s = readSession();
  return s ? { Authorization: `Bearer ${s.token}` } : {};
}

async function request(path: string, opts: Opts, extra: Record<string, string> = {}) {
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method || 'GET',
      signal: opts.signal,
      headers: { ...extra, ...(opts.auth ? authHeader() : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, 'NETWORK');
  }
  if (res.status === 401 && opts.auth && typeof window !== 'undefined') window.dispatchEvent(new Event('pharmacycle:unauthorized'));
  return res;
}

async function fail(res: Response): Promise<never> {
  let data: { error?: string; code?: string; fields?: Record<string, string[]> } = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(data.error || `Request failed (${res.status}).`, res.status, data.code, data.fields);
}

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const res = await request(path, opts, opts.body !== undefined ? { 'Content-Type': 'application/json' } : {});
  if (!res.ok) return fail(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function downloadCsv(path: string, query: Query): Promise<{ filename: string; rows: number }> {
  const res = await request(path, { auth: true, query });
  if (!res.ok) return fail(res);
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const filename = /filename="([^"]+)"/.exec(cd)?.[1] || 'export.csv';
  const rows = Number(res.headers.get('X-Row-Count') || 0);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return { filename, rows };
}

export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
export const fieldErrors = (e: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (e instanceof ApiError && e.fields) for (const [k, v] of Object.entries(e.fields)) out[k] = v[0];
  return out;
};

export async function apiUpload<T>(path: string, file: File, field = 'image'): Promise<T> {
  const form = new FormData();
  form.append(field, file);
  let res: Response;
  try {
    res = await fetch(buildUrl(path), { method: 'POST', headers: authHeader(), body: form });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, 'NETWORK');
  }
  if (res.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('pharmacycle:unauthorized'));
  if (!res.ok) return fail(res);
  return (await res.json()) as T;
}
