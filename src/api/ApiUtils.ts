import { useQuery } from '@tanstack/react-query';
import axios, { type AxiosError } from 'axios';

type ArrayEnvelope = {
  items?: unknown;
  results?: unknown;
  data?: unknown;
  rows?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Normalizes API payloads that should be arrays.
 * Supports common envelope shapes while keeping the boundary strict:
 * unknown/non-array payloads degrade to [] instead of crashing consumers.
 */
export const normalizeArrayResponse = <TItem = unknown>(
  payload: unknown,
): TItem[] => {
  if (Array.isArray(payload)) {
    return payload as TItem[];
  }

  if (isRecord(payload)) {
    const envelope = payload as ArrayEnvelope;
    const candidates = [
      envelope.items,
      envelope.results,
      envelope.data,
      envelope.rows,
    ];
    const firstArray = candidates.find((candidate) => Array.isArray(candidate));
    if (Array.isArray(firstArray)) {
      return firstArray as TItem[];
    }
  }

  return [];
};

export const useApiQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  enabled?: boolean,
  normalizeResponse?: (payload: unknown) => TResponse,
) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;

  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, url, queryParams],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${url}` : url;
      const { data } = await axios.get(requestUrl, { params: queryParams });
      if (normalizeResponse) {
        return normalizeResponse(data);
      }
      return data as TResponse;
    },
    retry: false,
    enabled: enabled ?? true,
    refetchInterval,
  });
};

export const useApiArrayQuery = <TItem = void>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  enabled?: boolean,
) =>
  useApiQuery<TItem[]>(
    queryName,
    url,
    refetchInterval,
    queryParams,
    enabled,
    normalizeArrayResponse<TItem>,
  );
