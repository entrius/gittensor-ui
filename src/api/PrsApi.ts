// Pull Request API hooks - uses /prs endpoints
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
