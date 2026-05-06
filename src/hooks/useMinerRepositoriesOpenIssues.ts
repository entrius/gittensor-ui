import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { type RepositoryIssue } from '../api/models/Miner';
import { type CommitLog } from '../api/models/Dashboard';

const REPO_FETCH_LIMIT = 50;

const buildReposIssuesPath = (repoFullName: string) =>
  `/repos/${encodeURIComponent(repoFullName)}/issues`;

const fetchRepositoryIssues = async (
  repoFullName: string,
): Promise<RepositoryIssue[]> => {
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  const path = buildReposIssuesPath(repoFullName);
  const requestUrl = baseUrl ? `${baseUrl}${path}` : path;
  const { data } = await axios.get<RepositoryIssue[]>(requestUrl);
  return data;
};

/**
 * Repositories where the miner has scored PR activity, ordered by most recent
 * PR timestamp (merged or created), capped for parallel fetch limits.
 *
 * PRs with a missing or blank ``repository`` field are dropped — leaving them
 * in produces an empty-string entry that the consumer dispatches as
 * ``GET /repos//issues``, which 404s on every fetch and pollutes the
 * react-query cache with a useless key.
 */
export const selectMinerIssueScanRepos = (prs: CommitLog[] | undefined) => {
  if (!prs?.length) return [];
  const latest = new Map<string, number>();
  prs.forEach((pr) => {
    const repo = pr.repository?.trim();
    if (!repo) return;
    const raw = pr.mergedAt || pr.prCreatedAt;
    const t = raw ? new Date(raw).getTime() : 0;
    const prev = latest.get(repo) ?? 0;
    if (t >= prev) latest.set(repo, t);
  });
  return [...latest.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([repo]) => repo)
    .slice(0, REPO_FETCH_LIMIT);
};

/**
 * Parallel fetch of `/repos/{repo}/issues` for each repository in `repos`.
 * Shares query keys with `useRepositoryIssues` so navigation can reuse cache.
 */
export const useMinerRepositoriesOpenIssues = (
  repos: string[],
  enabled: boolean,
) => {
  const stableRepos = useMemo(
    () => [...new Set(repos)].filter(Boolean),
    [repos],
  );

  const queries = useQueries({
    queries: stableRepos.map((repo) => {
      const url = buildReposIssuesPath(repo);
      return {
        queryKey: ['useRepositoryIssues', url, undefined] as const,
        queryFn: () => fetchRepositoryIssues(repo),
        enabled: enabled && stableRepos.length > 0,
        staleTime: 60_000,
      };
    }),
  });

  const isLoading = queries.some((q) => q.isLoading || q.isFetching);
  const isError = queries.some((q) => q.isError);

  const issuesByRepo = useMemo(() => {
    const map = new Map<string, RepositoryIssue[]>();
    stableRepos.forEach((repo, idx) => {
      const data = queries[idx]?.data;
      if (!data) return;
      map.set(repo, data);
    });
    return map;
  }, [queries, stableRepos]);

  return {
    repos: stableRepos,
    issuesByRepo,
    isLoading,
    isError,
    repoFetchLimit: REPO_FETCH_LIMIT,
  };
};
