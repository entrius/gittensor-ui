import { useApiQuery } from "./ApiUtils";
import { useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import {
  RepoChanges,
  CommitsTrend,
  Stats,
  Repository,
  LanguageWeight,
  CommitLog,
} from "./models/Dashboard";

export const useDashboardQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
) =>
  useApiQuery<TResponse, TSelect>(
    queryName,
    `/dash${url}`,
    refetchInterval,
    queryParams,
  );

export const useStats = () => useDashboardQuery<Stats>("useStats", "/stats");

export const useHistoricalTrend = () =>
  useDashboardQuery<CommitsTrend[]>("useHistoricalTrend", "/lines/hist-trend");

export const useRepoChanges = (options?: { refetchInterval?: number }) =>
  useDashboardQuery<RepoChanges[]>(
    "useRepoChanges",
    "/repos/commits",
    options?.refetchInterval,
  );

export const useReposAndWeights = () =>
  useDashboardQuery<Repository[]>("useReposAndWeights", "/repos");

export const useLanguagesAndWeights = () =>
  useDashboardQuery<LanguageWeight[]>("useLanguagesAndWeights", "/languages");

export const useCommitLog = (
  options?: { refetchInterval?: number },
  page?: number,
  limit?: number,
) =>
  useDashboardQuery<CommitLog[]>(
    "useCommitLog",
    "/commits",
    options?.refetchInterval,
    { page, limit },
  );

export const useInfiniteCommitLog = (options?: { refetchInterval?: number }) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  const limit = 15;

  return useInfiniteQuery({
    queryKey: ["useInfiniteCommitLog"],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const url = `/dash/commits`;
      const requestUrl = baseUrl ? `${baseUrl}${url}` : url;
      const { data } = await axios.get<CommitLog[]>(requestUrl, {
        params: { page: pageParam, limit },
      });
      return data;
    },
    getNextPageParam: (lastPage: CommitLog[], allPages: CommitLog[][]) => {
      // If the last page has fewer items than the limit, we've reached the end
      if (lastPage.length < limit) {
        return undefined;
      }
      // Otherwise, return the next page number
      return allPages.length + 1;
    },
    initialPageParam: 1,
    refetchInterval: options?.refetchInterval,
    retry: false,
  });
};

// Miner-specific hooks

export const useMinerPRs = (githubId: string, lookbackDays: number = 30) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  const url = `/dash/commits`;
  const encodedUrl = encodeURI(url);

  return useQuery<CommitLog[], AxiosError, CommitLog[]>({
    queryKey: [`useMinerPRs`, githubId, lookbackDays],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${encodedUrl}` : encodedUrl;
      const { data } = await axios.get<CommitLog[]>(requestUrl, {
        params: { page: 1, limit: 1000 }
      });
      return data;
    },
    select: (data) => {
      if (!data) return [];

      // Filter by author (GitHub username) and lookback days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      return data.filter((pr: CommitLog) => {
        const mergedDate = new Date(pr.mergedAt);
        return pr.author === githubId && mergedDate >= cutoffDate;
      });
    },
    retry: false,
  });
};

export const useAllMinerData = (lookbackDays: number = 30) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  const url = `/dash/commits`;
  const encodedUrl = encodeURI(url);

  const selectFn = useCallback((data: CommitLog[]) => {
    if (!data || !Array.isArray(data)) {
      console.warn('[useAllMinerData] API returned non-array data:', data);
      return [];
    }

    // Filter by lookback days only
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

    return data.filter((pr: CommitLog) => {
      const mergedDate = new Date(pr.mergedAt);
      return mergedDate >= cutoffDate;
    });
  }, [lookbackDays]);

  return useQuery<CommitLog[], AxiosError, CommitLog[]>({
    queryKey: [`useAllMinerData`, lookbackDays],
    queryFn: async () => {
      const requestUrl = baseUrl ? `${baseUrl}${encodedUrl}` : encodedUrl;
      // Fetch a reasonable number for good leaderboard representation with fast loading
      const { data } = await axios.get<CommitLog[]>(requestUrl, {
        params: { page: 1, limit: 500 }
      });
      return data;
    },
    select: selectFn,
    retry: false,
  });
};
