// Miner API hooks - uses /miners endpoints
import { useQueries } from '@tanstack/react-query';
import {
  githubFetch,
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

/**
 * Fan-out variant: one mirror-API call per miner, useful for the watchlist
 * and the dashboard issues-trend aggregation.
 *
 * `since` (ISO timestamp) is forwarded to the mirror as a query param. Omit
 * for the mirror's default 35-day window — this also keeps the cache key
 * stable across callers that don't need a custom range.
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

// Mirror-API view of a miner's pull requests — used to fill in date fields
// (`created_at`, `closed_at`) that the camelCase /miners/:id/prs endpoint
// doesn't currently return. Keyed by `${repo_full_name}#${pr_number}`.
type MirrorPullsResponse = {
  pull_requests?: Array<{
    repo_full_name: string;
    pr_number: number;
    created_at?: string | null;
    closed_at?: string | null;
    merged_at?: string | null;
  }>;
};

export type PrDateOverride = {
  createdAt: string | null;
  closedAt: string | null;
};

export const minerPullDatesKey = (repo: string, prNumber: number) =>
  `${repo}#${prNumber}`;

// Reach back far enough to cover anything the dashboard might display; the
// mirror defaults to a 35-day window which would miss older rows.
const MIRROR_PULLS_SINCE = '2024-01-01T00:00:00.000Z';

// Per-PR fallback: when the mirror has no record of a row (e.g. external
// repos the subnet doesn't track), hit GitHub directly for `created_at` /
// `closed_at`. Results are cached forever in React Query so pagination and
// re-renders don't refire, and individual failures (private repos, rate
// limits) degrade silently to a missing entry — the cell falls back to `—`
// for that single row instead of breaking the whole column.
const GITHUB_PR_DATES_STALE = Infinity;

export const useGithubPrDates = (
  prs: Array<{ repository: string; pullRequestNumber: number }>,
  enabled?: boolean,
): Map<string, PrDateOverride> => {
  const queries = useQueries({
    queries: prs.map((pr) => ({
      queryKey: ['githubPrDates', pr.repository, pr.pullRequestNumber] as const,
      queryFn: async () => {
        const data = await githubFetch<{
          created_at?: string | null;
          closed_at?: string | null;
        }>(
          `https://api.github.com/repos/${pr.repository}/pulls/${pr.pullRequestNumber}`,
        );
        return {
          createdAt: data.created_at ?? null,
          closedAt: data.closed_at ?? null,
        };
      },
      enabled: enabled ?? true,
      retry: false,
      staleTime: GITHUB_PR_DATES_STALE,
      gcTime: GITHUB_PR_DATES_STALE,
    })),
  });
  const map = new Map<string, PrDateOverride>();
  prs.forEach((pr, i) => {
    const q = queries[i];
    if (q?.data) {
      map.set(minerPullDatesKey(pr.repository, pr.pullRequestNumber), q.data);
    }
  });
  return map;
};

export const useMinerPullDates = (githubId: string, enabled?: boolean) =>
  useMirrorApiQuery<MirrorPullsResponse, Map<string, PrDateOverride>>(
    'useMinerPullDates',
    `/miners/${githubId}/pulls?since=${encodeURIComponent(MIRROR_PULLS_SINCE)}`,
    {
      enabled,
      select: (data) => {
        const map = new Map<string, PrDateOverride>();
        for (const p of data?.pull_requests ?? []) {
          map.set(minerPullDatesKey(p.repo_full_name, p.pr_number), {
            createdAt: p.created_at ?? null,
            closedAt: p.closed_at ?? null,
          });
        }
        return map;
      },
    },
  );
