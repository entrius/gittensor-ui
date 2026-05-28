// Pull Request API hooks - uses /prs endpoints
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { useApiQuery } from './ApiUtils';
import {
  type CommitLog,
  type PullRequestComment,
  type PullRequestDetails,
} from './models/Dashboard';

/**
 * Helper to create /prs endpoint queries
 */
const usePrsQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  enabled?: boolean,
) =>
  useApiQuery<TResponse, TSelect>(
    queryName,
    `/prs${url}`,
    refetchInterval,
    queryParams,
    enabled,
  );

/**
 * Get all pull requests across the network
 * Returns all PRs regardless of miner registration status
 */
export const useAllPrs = () => usePrsQuery<CommitLog[]>('useAllPrs', '');

// Shared cache key for the pull requests dataset.
export const getAllPrsQueryKey = () =>
  ['useAllPrs', '/prs', undefined] as const;

/**
 * Get detailed information for a specific pull request
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 * @param number - Pull request number
 */
export const usePullRequestDetails = (
  repo: string,
  number: number,
  enabled?: boolean,
) =>
  usePrsQuery<PullRequestDetails>(
    'usePullRequestDetails',
    '/details',
    undefined,
    { repo, number },
    enabled,
  );

/**
 * Get comments for a specific pull request
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 * @param number - Pull request number
 */
export const usePullRequestComments = (repo: string, number: number) =>
  usePrsQuery<PullRequestComment[]>(
    'usePullRequestComments',
    '/comments',
    undefined,
    {
      repo,
      number,
    },
  );

/**
 * Fetch comments for several pull requests of one repo in parallel.
 *
 * Each PR is a separate `/prs/comments` request (there's no bulk endpoint),
 * so callers must bound `numbers` to a sane size. Query keys mirror
 * `usePullRequestComments` exactly so results are shared with — and reused by
 * — the single-PR hook's cache.
 *
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 * @param numbers - PR numbers to fetch comments for
 * @param enabled - Gate the whole batch (e.g. until the PR list is loaded)
 */
export const usePullRequestCommentsBatch = (
  repo: string,
  numbers: number[],
  enabled = true,
) => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  return useQueries({
    queries: numbers.map((number) => ({
      queryKey: [
        'usePullRequestComments',
        '/prs/comments',
        { repo, number },
      ] as const,
      queryFn: async () => {
        const requestUrl = baseUrl
          ? `${baseUrl}/prs/comments`
          : '/prs/comments';
        const { data } = await axios.get<PullRequestComment[]>(requestUrl, {
          params: { repo, number },
        });
        return data;
      },
      retry: false,
      enabled,
    })),
  });
};
