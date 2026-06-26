import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { getAuthToken } from '../auth/token';

// Dedicated client for the das-gittensor API. A request interceptor attaches the
// session JWT as a Bearer token when present, so authed writes (PATCH/POST/DELETE
// /repos) work while public GETs are unaffected. Deliberately NOT a global axios
// interceptor: githubFetch / the mirror client hit other origins and must never
// receive our token.
export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_BASE_URL || undefined,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, url, queryParams],
    queryFn: async () => {
      const { data } = await apiClient.get(url, { params: queryParams });
      return data;
    },
    retry: false,
    enabled: enabled ?? true,
    refetchInterval,
  });
};

// Mutation helper for authed das-gittensor writes (PATCH/POST/DELETE). The caller
// supplies a function that performs the request via the injected `apiClient`
// (Bearer token attached automatically) and returns the response body; on success
// any `invalidateKeys` query keys are refetched so the UI reflects the write.
export const useApiMutation = <TVars, TResponse = unknown>(
  mutationFn: (client: AxiosInstance, vars: TVars) => Promise<TResponse>,
  options?: { invalidateKeys?: readonly unknown[][] },
) => {
  const queryClient = useQueryClient();
  return useMutation<TResponse, AxiosError, TVars>({
    mutationFn: (vars) => mutationFn(apiClient, vars),
    onSuccess: () => {
      options?.invalidateKeys?.forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      );
    },
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
// GitHub fetch helper
// ---------------------------------------------------------------------------
//
// Use `githubFetch` from inside a TanStack Query `queryFn` instead of calling
// `axios.get` directly when hitting `api.github.com`. It forwards the query's
// `AbortSignal` to axios so cancellation works without bespoke controller
// glue, and converts a 403 with `X-RateLimit-Remaining: 0` into a typed
// `RateLimitError` carrying the reset time, so the UI can render
// "Retries available at HH:MM" instead of a generic "Failed to load".

export class RateLimitError extends Error {
  readonly resetAt: Date | null;

  constructor(resetAt: Date | null) {
    super(
      resetAt
        ? `GitHub rate limit reached. Retries available at ${resetAt.toLocaleTimeString(
            undefined,
            { hour: '2-digit', minute: '2-digit' },
          )}.`
        : 'GitHub rate limit reached. Please try again later.',
    );
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

interface GithubFetchOptions {
  signal?: AbortSignal;
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
}

export async function githubFetch<T = unknown>(
  url: string,
  options: GithubFetchOptions = {},
): Promise<T> {
  try {
    const { data } = await axios.get<T>(url, options);
    return data;
  } catch (err) {
    if (
      axios.isAxiosError(err) &&
      err.response?.status === 403 &&
      err.response.headers?.['x-ratelimit-remaining'] === '0'
    ) {
      const seconds = Number(err.response.headers['x-ratelimit-reset']);
      const resetAt =
        Number.isFinite(seconds) && seconds > 0
          ? new Date(seconds * 1000)
          : null;
      throw new RateLimitError(resetAt);
    }
    throw err;
  }
}
