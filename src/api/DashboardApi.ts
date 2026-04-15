import { useApiQuery } from './ApiUtils';
import { useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  type RepoChanges,
  type CommitsTrend,
  type Stats,
  type Repository,
  type LanguageWeight,
  type CommitLog,
} from './models/Dashboard';

export const useDashboardQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  enabled?: boolean,
) =>
  useApiQuery<TResponse, TSelect>(
    queryName,
    `/dash${url}`,
    refetchInterval,
    queryParams,
    enabled,
  );

export const useStats = () => useDashboardQuery<Stats>('useStats', '/stats');

export const useHistoricalTrend = () =>
  useDashboardQuery<CommitsTrend[]>('useHistoricalTrend', '/lines/hist-trend');

export const useRepoChanges = (options?: { refetchInterval?: number }) =>
  useDashboardQuery<RepoChanges[]>(
    'useRepoChanges',
    '/repos/commits',
    options?.refetchInterval,
  );

// Shared cache key for the repositories dataset.
export const getReposQueryKey = () =>
  ['useReposAndWeights', '/dash/repos', undefined] as const;

export const useReposAndWeights = () =>
  useDashboardQuery<Repository[]>('useReposAndWeights', '/repos');

export const useLanguagesAndWeights = () =>
  useDashboardQuery<LanguageWeight[]>('useLanguagesAndWeights', '/languages');

export const useCommitLog = (
  options?: { refetchInterval?: number },
  page?: number,
  limit?: number,
) =>
  useDashboardQuery<CommitLog[]>(
    'useCommitLog',
    '/commits',
    options?.refetchInterval,
    { page, limit },
  );

export const useInfiniteCommitLog = (options?: {
  refetchInterval?: number;
}) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  const limit = 15;

  return useInfiniteQuery({
    queryKey: ['useInfiniteCommitLog'],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const url = '/dash/commits';
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
