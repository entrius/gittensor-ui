import { useQuery } from '@tanstack/react-query';
import axios, { type AxiosError } from 'axios';

const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_RETRIES = 3;

const isRetryableStatus = (status: number): boolean =>
  status === 429 || status >= 500;

export const shouldRetry = (
  failureCount: number,
  error: AxiosError,
): boolean => {
  if (failureCount >= MAX_RETRIES) return false;
  const status = error?.response?.status;
  if (status === undefined) return true; // network error or timeout — no HTTP response
  return isRetryableStatus(status);
};

export const getRetryDelay = (attempt: number): number =>
  Math.min(1_000 * 2 ** attempt, 30_000);

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
      const { data } = await axios.get(requestUrl, {
        params: queryParams,
        timeout: REQUEST_TIMEOUT_MS,
      });
      return data;
    },
    retry: shouldRetry,
    retryDelay: getRetryDelay,
    enabled: enabled ?? true,
    refetchInterval,
  });
};
