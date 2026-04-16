import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export type FetchFn<T> = (signal: AbortSignal) => Promise<T>;

export interface UseAbortableFetchOptions {
  /** Message surfaced in `error` when the fetch throws. Falls back to the
   *  thrown error's own message when not provided. */
  errorMessage?: string;
  /** Whether the initial `loading` state should be `true` (default) or `false`. */
  initialLoading?: boolean;
}

/**
 * A hook that runs an async fetch function and automatically cancels it via an
 * AbortController when the component unmounts or when the `deps` change.
 *
 * @param fetchFn  - Async function that receives an `AbortSignal` and returns data.
 *                   Return `null` to skip the fetch (e.g. when a required param is missing).
 * @param deps     - Dependency array – works exactly like `useEffect`'s second argument.
 * @param options  - Optional configuration: `errorMessage` and `initialLoading`.
 */
function useAbortableFetch<T>(
  fetchFn: FetchFn<T | null>,
  deps: React.DependencyList,
  options: UseAbortableFetchOptions = {},
): FetchState<T> {
  const { errorMessage, initialLoading = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable reference to fetchFn so callers don't need to memoize it.
  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFnRef.current(signal);
        if (signal.aborted) return;
        setData(result);
      } catch (err) {
        if (axios.isCancel(err) || signal.aborted) return;
        throw err; // let the caller's fetchFn handle error reporting
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    run().catch((err) => {
      if (!signal.aborted) {
        console.error('[useAbortableFetch]', err);
        setError(errorMessage ?? (err instanceof Error ? err.message : String(err)));
        setLoading(false);
      }
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

export default useAbortableFetch;
