import { useApiQuery } from './ApiUtils';
import { useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  type Stats,
  type Repository,
  type RepoChanges,
  type LanguageWeight,
  type CommitLog,
} from './models/Dashboard';

const useDashboardQuery = <TResponse = void, TSelect = TResponse>(
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

export const useReposAndWeights = (enabled?: boolean) =>
  useDashboardQuery<Repository[]>(
    'useReposAndWeights',
    '/repos',
    undefined,
    undefined,
    enabled,
  );

export const useLanguagesAndWeights = () =>
  useDashboardQuery<LanguageWeight[]>('useLanguagesAndWeights', '/languages');

/**
 * Per-repository commit aggregates (commits, additions, deletions, lines
 * changed) for the active repositories. Backed by `/dash/repos/commits`.
 */
export const useRepoCommits = () =>
  useDashboardQuery<RepoChanges[]>('useRepoCommits', '/repos/commits');

export const useRecentCommits = (limit = 500) =>
  useDashboardQuery<CommitLog[]>('useRecentCommits', '/commits', undefined, {
    page: 1,
    limit,
  });

// das-gittensor's /dash/lines/total responds with `{ linesCommitted }` — and
// because the value is a SQL SUM it arrives as a string. Consumers unwrap and
// coerce it (see useDashboardData).
export const useLinesTotal = (params: { from: string; to: string }) =>
  useDashboardQuery<{ linesCommitted: number | string }>(
    'useLinesTotal',
    '/lines/total',
    undefined,
    {
      from: params.from,
      to: params.to,
    },
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
    getNextPageParam: (
      lastPage: CommitLog[],
      _allPages: CommitLog[][],
      lastPageParam: number,
    ) => {
      // If the last page has fewer items than the limit, we've reached the end
      if (lastPage.length < limit) {
        return undefined;
      }
      // Use lastPageParam to avoid stale allPages count during background refetches
      return lastPageParam + 1;
    },
    initialPageParam: 1,
    refetchInterval: options?.refetchInterval,
    retry: false,
  });
};
