// frontend-web/src/pages/admin/monitoring/useMonFetch.ts
/**
 * Minimal polling hook for the monitoring dashboard.
 * Deliberately NOT TanStack Query (P1 decision): plain useEffect + setInterval.
 * Honest states: `loading` only on the FIRST fetch; background refreshes keep
 * old data on screen and flip `refreshing` instead.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const REFRESH_INTERVAL_MS = 30_000;

export interface MonFetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  /** local Date of the last successful fetch (client-side truth). */
  asOf: Date | null;
  /** force an immediate re-fetch (manual refresh button). */
  refresh: () => void;
}

export function useMonFetch<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  live: boolean,
  intervalMs: number = REFRESH_INTERVAL_MS,
): MonFetchState<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);

  const hasDataRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (hasDataRef.current) setRefreshing(true);
      else setLoading(true);
      try {
        const result = await fetcherRef.current();
        if (cancelled) return;
        hasDataRef.current = true;
        setData(result);
        setError(null);
        setAsOf(new Date());
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  useEffect(() => {
    if (!live) return undefined;
    const id = window.setInterval(() => setNonce((n) => n + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [live, intervalMs]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { data, error, loading, refreshing, asOf, refresh };
}
