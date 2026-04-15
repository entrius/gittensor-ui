import { useQuery } from '@tanstack/react-query';
import axios, { type AxiosError } from 'axios';

export const ensureArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? value : [];

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

export const useArrayApiQuery = <TItem = void>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  enabled?: boolean,
) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;

  return useQuery<TItem[], AxiosError, TItem[]>({
    queryKey: [queryName, url, queryParams],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${url}` : url;
      const { data } = await axios.get(requestUrl, { params: queryParams });
      return ensureArray<TItem>(data);
    },
    retry: false,
    enabled: enabled ?? true,
    refetchInterval,
  });
};
