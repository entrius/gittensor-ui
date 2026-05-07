import { useQueries, useQuery } from '@tanstack/react-query';
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

export const useMirrorApiQueries = <TResponse = unknown, TSelect = TResponse>(
  queryName: string,
  urls: string[],
  options?: {
    enabled?: boolean;
    select?: (data: TResponse) => TSelect;
  },
) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_MIRROR_BASE_URL;
  return useQueries({
    queries: urls.map((url) => ({
      queryKey: ['mirror', queryName, url] as const,
      queryFn: async () => {
        const requestUrl = baseUrl ? `${baseUrl}${url}` : url;
        const { data } = await axios.get(requestUrl);
        return data as TResponse;
      },
      select: options?.select,
      retry: false,
      enabled: options?.enabled ?? true,
    })),
  });
};

export const useApiQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  enabled?: boolean,
) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;

  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, url, queryParams],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${url}` : url;
      const { data } = await axios.get(requestUrl, { params: queryParams });
      return data;
    },
    retry: false,
    enabled: enabled ?? true,
    refetchInterval,
  });
};

// Mirror API (https://mirror.gittensor.io/api/v1) — returns raw snake_case
// payloads, so callers receive the response as-is and may transform it via
// `useQuery`'s `select`. Kept separate from `useApiQuery` so the camelCase
// production API isn't accidentally pointed at the mirror.
export const useMirrorApiQuery = <TResponse = unknown, TSelect = TResponse>(
  queryName: string,
  url: string,
  options?: {
    refetchInterval?: number;
    queryParams?: Record<string, string | number | undefined>;
    enabled?: boolean;
    select?: (data: TResponse) => TSelect;
  },
) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_MIRROR_BASE_URL;

  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: ['mirror', queryName, url, options?.queryParams],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${url}` : url;
      const { data } = await axios.get(requestUrl, {
        params: options?.queryParams,
      });
      return data;
    },
    select: options?.select,
    retry: false,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
};

// ---------------------------------------------------------------------------
// GitHub query helpers
// ---------------------------------------------------------------------------
//
// `githubFetch` and `useGithubQuery` are the only sanctioned ways to talk to
// `api.github.com` (or its raw-content cousins like `cdn.jsdelivr.net`). They
// centralise three things that were previously copy-pasted with drift:
//
// 1. AbortSignal forwarding so React Query auto-cancels when components
//    unmount or query keys change (no more racing PR diffs).
// 2. Rate-limit detection — a 403 with `X-RateLimit-Remaining: 0` is converted
//    to a typed `RateLimitError` carrying the reset time, so callers can show
//    a helpful "retries available at HH:MM" notice instead of a generic
//    "Failed to load".
// 3. Stable cache keys keyed on URL + params, so identical requests dedupe.

const formatRateLimitClock = (resetAt: Date): string =>
  resetAt.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

export class RateLimitError extends Error {
  readonly resetAt: Date | null;

  constructor(resetAt: Date | null) {
    super(
      resetAt
        ? `GitHub rate limit reached. Retries available at ${formatRateLimitClock(resetAt)}.`
        : 'GitHub rate limit reached. Please try again later.',
    );
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

const parseRateLimitReset = (
  headers: Record<string, unknown> | undefined,
): Date | null => {
  const raw = headers?.['x-ratelimit-reset'];
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
};

interface GithubFetchOptions {
  signal?: AbortSignal;
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  /**
   * `'text'` skips JSON parsing — used for raw markdown / source content from
   * jsdelivr or raw.githubusercontent.com.
   */
  responseType?: 'json' | 'text';
}

export async function githubFetch<T = unknown>(
  url: string,
  options: GithubFetchOptions = {},
): Promise<T> {
  const config: AxiosRequestConfig = {
    signal: options.signal,
    params: options.params,
    headers: options.headers,
  };
  if (options.responseType === 'text') {
    config.transformResponse = [(d) => d];
  }
  try {
    const { data } = await axios.get<T>(url, config);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 403) {
      const remaining = err.response.headers?.['x-ratelimit-remaining'];
      if (remaining === '0' || remaining === 0) {
        throw new RateLimitError(parseRateLimitReset(err.response.headers));
      }
    }
    throw err;
  }
}

interface UseGithubQueryOptions<TResponse, TSelect> {
  /** Extra cache-key segments — useful when callers pass identical URLs with
   *  semantically different meanings. */
  queryKey?: readonly unknown[];
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  responseType?: 'json' | 'text';
  enabled?: boolean;
  select?: (data: TResponse) => TSelect;
  staleTime?: number;
  retry?: number | boolean;
  /** Custom fetcher for compound flows (e.g. try multiple branches). The
   *  signal must be forwarded to every `githubFetch` call inside. */
  queryFn?: (ctx: { signal: AbortSignal }) => Promise<TResponse>;
}

export const useGithubQuery = <TResponse = unknown, TSelect = TResponse>(
  url: string | null | undefined,
  options?: UseGithubQueryOptions<TResponse, TSelect>,
) => {
  const hasFetcher = !!options?.queryFn || !!url;
  return useQuery<TResponse, Error, TSelect>({
    queryKey: [
      'github',
      url ?? null,
      options?.params ?? null,
      options?.queryKey ?? null,
    ],
    queryFn: async ({ signal }) => {
      if (options?.queryFn) return options.queryFn({ signal });
      return githubFetch<TResponse>(url!, {
        signal,
        params: options?.params,
        headers: options?.headers,
        responseType: options?.responseType,
      });
    },
    select: options?.select,
    enabled: (options?.enabled ?? true) && hasFetcher,
    retry: options?.retry ?? false,
    staleTime: options?.staleTime,
  });
};

/**
 * Render-friendly message for any error returned by `useGithubQuery`.
 * Prefer this over reading `error.message` directly — it preserves the
 * structured rate-limit copy while letting callers supply a domain-specific
 * fallback for everything else.
 */
export const githubErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (error instanceof RateLimitError) return error.message;
  return fallback;
};
