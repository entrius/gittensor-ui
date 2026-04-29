import { useQueries, useQuery } from '@tanstack/react-query';
import axios, { type AxiosError } from 'axios';

// Mirror API (https://mirror.gittensor.io/api/v1) — raw snake_case payloads.
const MIRROR_BASE = (): string | undefined =>
  import.meta.env.VITE_REACT_APP_MIRROR_BASE_URL;

export const useMirrorApiQuery = <TResponse = unknown, TSelect = TResponse>(
  queryName: string,
  url: string,
  options?: {
    enabled?: boolean;
    select?: (data: TResponse) => TSelect;
  },
) => {
  const baseUrl = MIRROR_BASE();
  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: ['mirror', queryName, url],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${url}` : url;
      const { data } = await axios.get(requestUrl);
      return data;
    },
    select: options?.select,
    retry: false,
    enabled: options?.enabled ?? true,
  });
};

export const useMirrorApiQueries = <TResponse = unknown, TSelect = TResponse>(
  queryName: string,
  urls: string[],
  options?: {
    enabled?: boolean;
    select?: (data: TResponse) => TSelect;
  },
) => {
  const baseUrl = MIRROR_BASE();
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
