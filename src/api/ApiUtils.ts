import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";

export const useApiQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string
) => {
  const encodedUrl = encodeURI(url);

  return useQuery<TResponse, AxiosError, TSelect>({
    queryKey: [queryName, encodedUrl],
    queryFn: async () => {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BASE_URL}${encodedUrl}`
      );
      return data;
    },
  });
};
