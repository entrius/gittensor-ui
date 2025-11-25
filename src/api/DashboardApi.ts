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
  MinerEvaluation,
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

export const useMinersQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
) =>
  useApiQuery<TResponse, TSelect>(
    queryName,
    `/miners${url}`,
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

export const useInfiniteCommitLog = (options?: {
  refetchInterval?: number;
}) => {
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

// Miner-specific hooks - optimized to use new /miners endpoints

/**
 * Get all pull requests for a specific miner
 * Uses the optimized /miners/:githubId/prs endpoint
 */
export const useMinerPRs = (githubId: string) =>
  useMinersQuery<CommitLog[]>("useMinerPRs", `/${githubId}/prs`);

/**
 * Get pre-computed stats for a specific miner (totalScore, baseTotalScore, totalPRs, etc.)
 * Much faster than aggregating PRs - uses the MinerEvaluations table
 */
export const useMinerStats = (githubId: string) =>
  useMinersQuery<MinerEvaluation>("useMinerStats", `/${githubId}/stats`);

/**
 * Get all miners' PR data
 * Uses the optimized /miners/all/prs endpoint
 */
export const useAllMinerData = () =>
  useMinersQuery<CommitLog[]>("useAllMinerData", "/all/prs");

/**
 * Get all miners' pre-computed stats for leaderboards
 * Much faster than aggregating PRs - uses the MinerEvaluations table
 * Max 256 miners in the subnet
 */
export const useAllMinerStats = () =>
  useMinersQuery<MinerEvaluation[]>(
    "useAllMinerStats",
    "/stats/all",
    undefined,
  );
