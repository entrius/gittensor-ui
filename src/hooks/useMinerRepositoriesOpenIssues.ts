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
 */
export const selectMinerIssueScanRepoSummary = (
  prs: CommitLog[] | undefined,
) => {
  if (!prs?.length) return { repos: [], totalRepos: 0 };
  const latest = new Map<string, number>();
  prs.forEach((pr) => {
    const raw = pr.mergedAt || pr.prCreatedAt;
    const t = raw ? new Date(raw).getTime() : 0;
    const prev = latest.get(pr.repository) ?? 0;
    if (t >= prev) latest.set(pr.repository, t);
  });
  const repos = [...latest.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([repo]) => repo)
    .slice(0, REPO_FETCH_LIMIT);

  return { repos, totalRepos: latest.size };
};

export const selectMinerIssueScanRepos = (prs: CommitLog[] | undefined) =>
  selectMinerIssueScanRepoSummary(prs).repos;

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
