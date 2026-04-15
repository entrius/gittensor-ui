import { useEffect, useRef, useState, type DependencyList } from 'react';
import axios from 'axios';

export type AbortableFetchState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

export type UseAbortableFetchOptions = {
  enabled?: boolean;
};

const isCancellation = (err: unknown): boolean => {
  if (axios.isCancel(err)) return true;
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name?: string }).name;
    return name === 'AbortError' || name === 'CanceledError';
  }
  return false;
};

export function useAbortableFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options: UseAbortableFetchOptions = {},
): AbortableFetchState<T> {
  const { enabled = true } = options;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isCancellation(err)) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, loading, error };
}

export default useAbortableFetch;
