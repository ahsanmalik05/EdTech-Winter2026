import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_STALE_MS = 30000; // 30 seconds

interface UseQueryOptions<T> {
  select?: (raw: any) => T;
  staleTime?: number;
  enabled?: boolean;
}

interface UseQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
  mutate: (updater: T | ((prev: T | undefined) => T)) => void;
}

export function useQuery<T = any>(
  url: string | null,
  options: UseQueryOptions<T> = {},
): UseQueryResult<T> {
  const { select, staleTime = DEFAULT_STALE_MS, enabled = true } = options;

  const [data, setData] = useState<T | undefined>(() => {
    if (!url) return undefined;
    const hit = cache.get(url) as CacheEntry<T> | undefined;
    return hit?.data;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!url || !enabled) return false;
    const hit = cache.get(url);
    return !hit;
  });
  const [error, setError] = useState('');

  const selectRef = useRef(select);
  selectRef.current = select;

  const fetchData = useCallback(async () => {
    if (!url) return;
    setError('');

    const hit = cache.get(url) as CacheEntry<T> | undefined;
    if (hit) {
      setData(hit.data);
      if (Date.now() - hit.timestamp < staleTime) {
        setLoading(false);
        return;
      }
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get(url);
      const transformed = selectRef.current ? selectRef.current(res.data) : res.data;
      cache.set(url, { data: transformed, timestamp: Date.now() });
      setData(transformed as T);
    } catch {
      if (!hit) setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [url, staleTime]);

  useEffect(() => {
    if (enabled) fetchData();
  }, [fetchData, enabled]);

  const refetch = useCallback(async () => {
    if (!url) return;
    cache.delete(url);
    setLoading(true);
    setError('');
    try {
      const res = await api.get(url);
      const transformed = selectRef.current ? selectRef.current(res.data) : res.data;
      cache.set(url, { data: transformed, timestamp: Date.now() });
      setData(transformed as T);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [url]);

  const mutate = useCallback(
    (updater: T | ((prev: T | undefined) => T)) => {
      setData((prev) => {
        const next = typeof updater === 'function'
          ? (updater as (prev: T | undefined) => T)(prev)
          : updater;
        if (url) cache.set(url, { data: next, timestamp: Date.now() });
        return next;
      });
    },
    [url],
  );

  return { data, loading, error, refetch, mutate };
}

export function invalidateQuery(url: string) {
  cache.delete(url);
}

export function invalidateQueries(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
