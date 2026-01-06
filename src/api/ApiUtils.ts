import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";

export const useApiQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  options?: { enabled?: boolean },
) => {
  const encodedUrl = encodeURI(url);
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;

  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, encodedUrl, queryParams],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${encodedUrl}` : encodedUrl;
      const { data } = await axios.get(requestUrl, { params: queryParams });
      return data;
    },
    retry: false,
    enabled: options?.enabled ?? true,
    refetchInterval: refetchInterval,
  });
};
