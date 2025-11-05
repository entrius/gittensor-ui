import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";

export const useApiQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number
) => {
  const encodedUrl = encodeURI(url);
  const baseUrl = import.meta.env.VITE_BASE_URL;

  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, encodedUrl],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${encodedUrl}` : encodedUrl;
      const { data } = await axios.get(requestUrl);
      return data;
    },
    retry: false,
    enabled: true,
    refetchInterval: refetchInterval,
  });
};
