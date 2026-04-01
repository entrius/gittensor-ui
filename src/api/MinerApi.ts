// Miner API hooks - uses /miners endpoints
import { useApiQuery } from './ApiUtils';
import {
  type GithubMinerData,
  type MinerEvaluation,
  type CommitLog,
} from './models/Dashboard';

/**
 * Helper to create /miners endpoint queries
 */
const useMinersQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  enabled?: boolean,
) =>
  useApiQuery<TResponse, TSelect>(
    queryName,
    `/miners${url}`,
    refetchInterval,
    queryParams,
    enabled,
  );

/**
 * Get all active miners with their pre-computed stats
 * Only includes miners currently registered on the subnet (in current_miners table)
 * Ideal for leaderboards
 */
export const useAllMiners = () =>
  useMinersQuery<MinerEvaluation[]>('useAllMiners', '');

// Shared cache key for the miners dataset.
export const getAllMinersQueryKey = () =>
  ['useAllMiners', '/miners', undefined] as const;

/**
 * Get pre-computed stats for a specific miner
 * @param githubId - Numeric GitHub ID (e.g., "583231"), NOT username
 */
export const useMinerStats = (githubId: string) =>
  useMinersQuery<MinerEvaluation>('useMinerStats', `/${githubId}`);

/**
 * Get all pull requests for a specific miner
 * @param githubId - Numeric GitHub ID (e.g., "583231"), NOT username
 * @param enabled - Optional flag to enable/disable the query
 */
export const useMinerPRs = (githubId: string, enabled?: boolean) =>
  useMinersQuery<CommitLog[]>(
    'useMinerPRs',
    `/${githubId}/prs`,
    undefined,
    undefined,
    enabled,
  );

/**
 * Get GitHub profile data for a specific miner
 * @param githubId - Numeric GitHub ID (e.g., "583231"), NOT username
 * @param enabled - Optional flag to enable/disable the query
 */
export const useMinerGithubData = (githubId: string, enabled?: boolean) =>
  useMinersQuery<GithubMinerData>(
    'useMinerGithubData',
    `/${githubId}/github`,
    undefined,
    undefined,
    enabled,
  );
