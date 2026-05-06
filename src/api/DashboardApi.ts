import { useApiQuery } from './ApiUtils';
import { useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
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

export const COMMIT_LOG_PAGE_LIMIT = 15;

export const getNextCommitLogPageParam = (
  lastPage: CommitLog[],
  lastPageParam: number,
) => {
  if (lastPage.length < COMMIT_LOG_PAGE_LIMIT) {
    return undefined;
  }

  return lastPageParam + 1;
};
export const useInfiniteCommitLog = (options?: {
  refetchInterval?: number;
}) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;

  return useInfiniteQuery({
    queryKey: ['useInfiniteCommitLog'],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const url = '/dash/commits';
      const requestUrl = baseUrl ? `${baseUrl}${url}` : url;
      const { data } = await axios.get<CommitLog[]>(requestUrl, {
        params: { page: pageParam, limit: COMMIT_LOG_PAGE_LIMIT },
      });
      return data;
    },
    getNextPageParam: (
      lastPage: CommitLog[],
      _allPages: CommitLog[][],
      lastPageParam: number,
    ) => getNextCommitLogPageParam(lastPage, lastPageParam),
    initialPageParam: 1,
    refetchInterval: options?.refetchInterval,
    retry: false,
  });
};
