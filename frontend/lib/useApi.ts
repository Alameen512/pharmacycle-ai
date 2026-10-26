'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api';

type Query = Record<string, string | number | boolean | undefined | null>;

// Authenticated GET with loading + error state. Pass path=null to skip fetching.
export function useApi<T>(path: string | null, query?: Query) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);
  const [tick, setTick] = useState(0);
  const key = path === null ? null : `${path}?${JSON.stringify(query || {})}`;

  useEffect(() => {
    if (path === null) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api<T>(path, { query, auth: true, signal: ctrl.signal })
      .then((d) => setData(d))
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setError(errorMessage(e));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
