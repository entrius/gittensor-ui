/**
 * Frontend-only fallback that backfills the dashboard's "Featured Discoverers"
 * section while the prod API doesn't expose issue authors on its own data
 * sources. See the TODO block above `buildDailyDiscovererRows` in
 * `dashboardDiscoveryPulse.ts` for the full backend audit.
 *
 * Strategy: fire a single GitHub Issues Search query scoped to the mirror
 * repos (the only repos where issue discovery rewards apply) and return
 * enriched records with `authorGithubId` and `authorLogin` so the existing
 * `buildDailyDiscoveryPulse` accounting can resolve filers to registered
 * miners.
 *
 * Rate-limit posture: one unauthenticated request per dashboard load, cached
 * for 5 minutes, no retries (graceful empty-state on 403/429/network).
 */
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { type DiscoveryIssueRecord } from '../pages/dashboard/dashboardDiscoveryPulse';

/**
 * Repositories where issue discovery rewards apply. Issues filed in any
 * other repo do not count toward miner discovery scoring.
 *
 * Source of truth is the backend mirror service — there is no public
 * endpoint that lists this set, so the list is mirrored here and verified
 * empirically by aggregating `repo_full_name` across
 * `/miners/{id}/issues` mirror responses.
 *
 * TODO(backend): expose a `/repos/discovery-eligible` (or similar) endpoint
 * so this list doesn't need to be hardcoded on the frontend.
 */
const MIRROR_DISCOVERY_REPOS: readonly string[] = [
  'entrius/allways',
  'entrius/allways-ui',
  'entrius/gittensor',
  'entrius/gittensor-ui',
];

const ACTIVITY_WINDOW_HOURS = 48;
const SEARCH_PAGE_SIZE = 100;
const STALE_TIME_MS = 5 * 60 * 1000;

const ACTIVITY_WINDOW_MS = ACTIVITY_WINDOW_HOURS * 60 * 60 * 1000;

interface GithubSearchIssueItem {
  number: number;
  created_at: string;
  pull_request?: unknown;
  repository_url?: string;
  user?: { login?: string; id?: number } | null;
}

interface GithubSearchIssuesResponse {
  items?: GithubSearchIssueItem[];
}

const parseRepoFullName = (repositoryUrl: string | undefined): string => {
  if (!repositoryUrl) return '';
  const idx = repositoryUrl.indexOf('/repos/');
  return idx >= 0 ? repositoryUrl.slice(idx + '/repos/'.length) : '';
};

interface UseDailyDiscoveryFilersResult {
  data: DiscoveryIssueRecord[];
  isLoading: boolean;
  isError: boolean;
}

export const useDailyDiscoveryFilers = (): UseDailyDiscoveryFilersResult => {
  const query = useQuery<DiscoveryIssueRecord[]>({
    queryKey: ['useDailyDiscoveryFilers', MIRROR_DISCOVERY_REPOS],
    enabled: MIRROR_DISCOVERY_REPOS.length > 0,
    staleTime: STALE_TIME_MS,
    refetchInterval: STALE_TIME_MS,
    retry: false,
    queryFn: async () => {
      const sinceIso = new Date(Date.now() - ACTIVITY_WINDOW_MS).toISOString();
      const repoFilter = MIRROR_DISCOVERY_REPOS.map(
        (repo) => `repo:${repo}`,
      ).join(' ');
      const q = `is:issue created:>=${sinceIso} ${repoFilter}`;

      const { data } = await axios.get<GithubSearchIssuesResponse>(
        'https://api.github.com/search/issues',
        {
          params: {
            q,
            per_page: SEARCH_PAGE_SIZE,
            sort: 'created',
            order: 'desc',
          },
          headers: { Accept: 'application/vnd.github+json' },
        },
      );

      const allowed = new Set(
        MIRROR_DISCOVERY_REPOS.map((r) => r.toLowerCase()),
      );
      return (data.items ?? [])
        .filter((item) => !item.pull_request)
        .map((item) => {
          const repoFullName = parseRepoFullName(item.repository_url);
          return {
            repositoryFullName: repoFullName,
            number: item.number,
            createdAt: item.created_at,
            authorGithubId: item.user?.id != null ? String(item.user.id) : null,
            authorLogin: item.user?.login ?? null,
          } satisfies DiscoveryIssueRecord;
        })
        .filter(
          (issue) =>
            !!issue.repositoryFullName &&
            allowed.has(issue.repositoryFullName.toLowerCase()),
        );
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
