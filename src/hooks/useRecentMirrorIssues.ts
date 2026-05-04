/**
 * Fetches recent issues opened in the 4 issue-discovery-enabled (mirror)
 * repositories, which are the only repos where issue-discovery rewards
 * apply. Used by the dashboard's "Featured Discoverers" section to surface
 * the freshest issue-discovery work by registered miners.
 *
 * Why GitHub Search (not our own API): none of our endpoints reliably
 * expose the issue filer — `/prs.linkedIssues` is never populated,
 * `/repos/{repo}/issues` leaves `authorLogin`/`authorGithubId` null, the
 * mirror `/miners/{id}/issues` lags ~several hours, and `/issues` only
 * covers bountied records. Once the backend exposes a reliable per-issue
 * filer feed for the mirror repos, this hook can be replaced with a
 * direct API call.
 *
 * Rate-limit posture: one unauthenticated request per dashboard load,
 * cached 5 minutes, no retries (graceful empty-state on 403/429/network).
 */
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { type RecentMirrorIssue } from '../pages/dashboard/dashboardDiscoveryPulse';

/**
 * Repositories where issue-discovery rewards apply. TODO(backend): expose
 * a `/repos/discovery-eligible` endpoint so this list doesn't need to be
 * hardcoded on the frontend.
 */
const MIRROR_DISCOVERY_REPOS: readonly string[] = [
  'entrius/allways',
  'entrius/allways-ui',
  'entrius/gittensor',
  'entrius/gittensor-ui',
];

const SEARCH_WINDOW_DAYS = 7;
const SEARCH_PAGE_SIZE = 100;
/**
 * Maximum number of pages we'll fetch from GitHub Search. With
 * `SEARCH_PAGE_SIZE=100` this covers up to 300 issues per 7-day window,
 * which comfortably exceeds peak observed volume (~127 on 2026-05-04).
 * Each dashboard load triggers at most this many unauthenticated requests,
 * still well under GitHub's 10 req/min anonymous limit given the 5-minute
 * cache.
 */
const SEARCH_MAX_PAGES = 3;
const STALE_TIME_MS = 5 * 60 * 1000;

interface GithubSearchIssueItem {
  number: number;
  title?: string;
  html_url?: string;
  state?: string;
  state_reason?: string | null;
  created_at: string;
  closed_at?: string | null;
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

interface UseRecentMirrorIssuesResult {
  data: RecentMirrorIssue[];
  isLoading: boolean;
  isError: boolean;
}

export const useRecentMirrorIssues = (): UseRecentMirrorIssuesResult => {
  const query = useQuery<RecentMirrorIssue[]>({
    queryKey: ['useRecentMirrorIssues', MIRROR_DISCOVERY_REPOS],
    staleTime: STALE_TIME_MS,
    refetchInterval: STALE_TIME_MS,
    retry: false,
    queryFn: async () => {
      const sinceIso = new Date(
        Date.now() - SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
      const repoFilter = MIRROR_DISCOVERY_REPOS.map(
        (repo) => `repo:${repo}`,
      ).join(' ');
      const q = `is:issue created:>=${sinceIso} ${repoFilter}`;

      const aggregated: GithubSearchIssueItem[] = [];
      for (let page = 1; page <= SEARCH_MAX_PAGES; page += 1) {
        const { data } = await axios.get<GithubSearchIssuesResponse>(
          'https://api.github.com/search/issues',
          {
            params: {
              q,
              per_page: SEARCH_PAGE_SIZE,
              page,
              sort: 'created',
              order: 'desc',
            },
            headers: { Accept: 'application/vnd.github+json' },
          },
        );
        const pageItems = data.items ?? [];
        aggregated.push(...pageItems);
        if (pageItems.length < SEARCH_PAGE_SIZE) break;
      }

      const allowed = new Set(
        MIRROR_DISCOVERY_REPOS.map((r) => r.toLowerCase()),
      );
      return aggregated
        .filter((item) => !item.pull_request)
        .map<RecentMirrorIssue>((item) => {
          const repo = parseRepoFullName(item.repository_url);
          return {
            repositoryFullName: repo,
            number: item.number,
            title: item.title ?? `Issue #${item.number}`,
            htmlUrl: item.html_url ?? '',
            state: item.state === 'closed' ? 'closed' : 'open',
            createdAt: item.created_at,
            closedAt: item.closed_at ?? null,
            authorGithubId: item.user?.id != null ? String(item.user.id) : null,
            authorLogin: item.user?.login ?? null,
          };
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
