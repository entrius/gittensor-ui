// Miner API hooks - uses /miners endpoints
import {
  useApiQuery,
  useMirrorApiQueries,
  useMirrorApiQuery,
} from './ApiUtils';
import {
  type GithubMinerData,
  type MinerEvaluation,
  type CommitLog,
  type MinerIssue,
  type MinerIssuesResponse,
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

/**
 * Mirror-API issues for a single miner. `select` unwraps `{ issues: [...] }`.
 * Get all issues authored or solved by a specific miner.
 * Hits the mirror API (https://mirror.gittensor.io/api/v1) which returns the
 * raw snake_case payload — `select` unwraps `{ issues: [...] }` for callers.
 * @param githubId - Numeric GitHub ID (e.g., "583231"), NOT username
 * @param enabled - Optional flag to enable/disable the query
 */
export const useMinerIssues = (githubId: string, enabled?: boolean) =>
  useMirrorApiQuery<MinerIssuesResponse, MinerIssue[]>(
    'useMinerIssues',
    `/miners/${githubId}/issues`,
    {
      enabled,
      select: (data) => data?.issues ?? [],
    },
  );

/** Subnet-launch `since` (2025-12-01 UTC). Module-level keeps the cache key stable. */
export const MINER_ISSUES_FULL_HISTORY_SINCE_ISO = new Date(
  Date.UTC(2025, 11, 1, 0, 0, 0),
).toISOString();

/**
 * One mirror call per miner. ⚠️ Omitting `since` returns OPEN-only rows —
 * pass `MINER_ISSUES_FULL_HISTORY_SINCE_ISO` to include closed/resolved.
 */
export const useMinersIssues = (
  githubIds: string[],
  enabled?: boolean,
  since?: string,
) =>
  useMirrorApiQueries<MinerIssuesResponse, MinerIssue[]>(
    'useMinerIssues',
    githubIds.map((id) => {
      const path = `/miners/${id}/issues`;
      return since ? `${path}?since=${encodeURIComponent(since)}` : path;
    }),
    {
      enabled,
      select: (data) => data?.issues ?? [],
    },
  );
