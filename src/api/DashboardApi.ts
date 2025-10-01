import { useApiQuery } from "./ApiUtils";
import { RepoChanges, CommitsTrend, Stats } from "./models/Dashboard";

export const useDashboardQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string
) => useApiQuery<TResponse, TSelect>(queryName, `/dash${url}`);

export const useStats = () => useDashboardQuery<Stats>("useStats", "/stats");

export const useHistoricalTrend = () =>
  useDashboardQuery<CommitsTrend[]>("useHistoricalTrend", "/lines/hist-trend");

export const useRepoChanges = () =>
  useDashboardQuery<RepoChanges[]>("useRepoChanges", "/repos/commits");
