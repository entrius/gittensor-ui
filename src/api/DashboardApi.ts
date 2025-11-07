import { useApiQuery } from "./ApiUtils";
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
) => useApiQuery<TResponse, TSelect>(queryName, `/dash${url}`, refetchInterval);

export const useStats = () => useDashboardQuery<Stats>("useStats", "/stats");

export const useHistoricalTrend = () =>
  useDashboardQuery<CommitsTrend[]>("useHistoricalTrend", "/lines/hist-trend");

export const useRepoChanges = (options?: { refetchInterval?: number }) =>
  useDashboardQuery<RepoChanges[]>("useRepoChanges", "/repos/commits", options?.refetchInterval);

export const useReposAndWeights = () =>
  useDashboardQuery<Repository[]>("useReposAndWeights", "/repos");

export const useLanguagesAndWeights = () =>
  useDashboardQuery<LanguageWeight[]>("useLanguagesAndWeights", "/languages");

export const useCommitLog = (options?: { refetchInterval?: number }) =>
  useDashboardQuery<CommitLog[]>("useCommitLog", "/commits", options?.refetchInterval);
