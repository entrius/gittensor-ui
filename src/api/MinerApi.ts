// Miner API hooks - uses /miners endpoints
import { useMemo } from 'react';
import {
  useApiQuery,
  useMirrorApiQueries,
  useMirrorApiQuery,
} from './ApiUtils';
import {
  type GithubMinerData,
  type MinerEvaluation,
  type MinerRepositoryEvaluation,
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

// The `miner_evaluations` numeric columns are postgres `numeric`, but the
// das-gittensor entity types them `float` — TypeORM hands them back as
// strings on the single-miner endpoint. Coerce the per-repo rows so callers
// can sort / do arithmetic / call `.toFixed()` without a runtime crash.
const NUMERIC_REPO_FIELDS: readonly (keyof MinerRepositoryEvaluation)[] = [
  'id',
  'uid',
  'baseTotalScore',
  'totalScore',
  'totalCollateralScore',
  'totalNodesScored',
  'totalTokenScore',
  'totalStructuralCount',
  'totalStructuralScore',
  'totalLeafCount',
  'totalLeafScore',
  'totalOpenPrs',
  'totalClosedPrs',
  'totalMergedPrs',
  'totalPrs',
  'uniqueReposCount',
  'credibility',
  'issueDiscoveryScore',
  'issueTokenScore',
  'issueCredibility',
  'totalSolvedIssues',
  'totalValidSolvedIssues',
  'totalClosedIssues',
  'totalOpenIssues',
];

const normalizeRepoRow = (
  row: MinerRepositoryEvaluation,
): MinerRepositoryEvaluation => {
  const next = { ...row } as Record<string, unknown>;
  for (const field of NUMERIC_REPO_FIELDS) {
    next[field] = Number(row[field]) || 0;
  }
  return next as MinerRepositoryEvaluation;
};

/**
 * Get pre-computed stats for a specific miner.
 * @param githubId - Numeric GitHub ID (e.g., "583231"), NOT username
 */
export const useMinerStats = (githubId: string) => {
  const query = useMinersQuery<MinerEvaluation>(
    'useMinerStats',
    `/${githubId}`,
  );
  const data = useMemo<MinerEvaluation | undefined>(() => {
    const raw = query.data;
    if (!raw?.repositories) return raw;
    return { ...raw, repositories: raw.repositories.map(normalizeRepoRow) };
  }, [query.data]);
  return { ...query, data };
};

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
 * @param since - Optional ISO timestamp forwarded as `?since=` to the mirror.
 *                Omit for the mirror's default 35-day window.
 */
export const useMinerIssues = (
  githubId: string,
  enabled?: boolean,
  since?: string,
) =>
  useMirrorApiQuery<MinerIssuesResponse, MinerIssue[]>(
    'useMinerIssues',
    since
      ? `/miners/${githubId}/issues?since=${encodeURIComponent(since)}`
      : `/miners/${githubId}/issues`,
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
