import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";

export const useApiQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
) => {
  const encodedUrl = encodeURI(url);
  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, encodedUrl, queryParams],
    queryFn: async () => {
      const requestUrl = encodedUrl;
      const { data } = await axios.get(requestUrl, { params: queryParams });
      return data;
    },
    retry: false,
    enabled: true,
    refetchInterval: refetchInterval,
  });
};
