import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";

export const useApiQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string
) => {
  const encodedUrl = encodeURI(url);
  const baseUrl = import.meta.env.VITE_BASE_URL;

  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, encodedUrl],
    queryFn: async () => {
      // If no base URL is configured, return undefined to prevent crashes
      if (!baseUrl) {
        console.warn(
          `API call to ${encodedUrl} skipped: VITE_BASE_URL not configured`
        );
        return undefined as TResponse;
      }

      const { data } = await axios.get(`${baseUrl}${encodedUrl}`);
      return data;
    },
    retry: false, // Don't retry if API is not configured
    enabled: !!baseUrl, // Only run query if base URL exists
  });
};
