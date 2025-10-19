import { useApiQuery } from "./ApiUtils";
import {
  RepoChanges,
  CommitsTrend,
  Stats,
  Repository,
  LanguageWeight,
} from "./models/Dashboard";

export const useDashboardQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
) => useApiQuery<TResponse, TSelect>(queryName, `/dash${url}`);

export const useStats = () => useDashboardQuery<Stats>("useStats", "/stats");

export const useHistoricalTrend = () =>
  useDashboardQuery<CommitsTrend[]>("useHistoricalTrend", "/lines/hist-trend");

export const useRepoChanges = () =>
  useDashboardQuery<RepoChanges[]>("useRepoChanges", "/repos/commits");

export const useReposAndWeights = () =>
  useDashboardQuery<Repository[]>("useReposAndWeights", "/repos");

export const useLanguagesAndWeights = () =>
  useDashboardQuery<LanguageWeight[]>("useLanguagesAndWeights", "/languages");
