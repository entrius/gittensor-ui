// Maintainer activity — merged PRs authored by a repo's own maintainers.
//
// The scoring pipeline deliberately excludes maintainer-authored PRs from
// /prs (maintainers are paid through the repo's maintainer_cut carve-out,
// not per-PR scores), so activity digests built from /prs alone undercount
// repos where the maintainer ships their own work. This hook recovers those
// PRs from the mirror, restricted to accounts that are BOTH listed as a
// maintainer of a repo with maintainerCut > 0 AND registered as a miner
// UID — the same conditions under which the carve-out actually pays them.
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { parseNumber } from '../utils';
import { type MinerEvaluation, type Repository } from './models/Dashboard';

const MIRROR_BASE_URL = import.meta.env.VITE_REACT_APP_MIRROR_BASE_URL;

interface MirrorRepoMaintainersResponse {
  repo_full_name: string;
  maintainers: Array<{
    github_id: string | number;
    login: string;
    association: string;
  }>;
}

interface MirrorMinerPullsResponse {
  github_id: string | number;
  pull_requests: Array<{
    repo_full_name: string;
    pr_number: number;
    state: string;
    merged_at: string | null;
  }>;
}

export interface MaintainerMergedPr {
  pullRequestNumber: number;
  mergedAt: string;
  author: string;
}

const mirrorQuery = <TResponse>(url: string) => ({
  queryKey: ['mirror', 'maintainerActivity', url] as const,
  queryFn: async () => {
    const { data } = await axios.get(`${MIRROR_BASE_URL}${url}`);
    return data as TResponse;
  },
  retry: false,
  staleTime: 5 * 60 * 1000,
  enabled: Boolean(MIRROR_BASE_URL),
});

/**
 * Merged PRs authored by registered maintainers of cut-bearing repos,
 * keyed by lowercased repo full name. A maintainer's merges only count
 * toward repos they maintain — their contributions elsewhere already flow
 * through /prs as ordinary miner PRs.
 *
 * Returns undefined until both inputs and the maintainer lookups resolve;
 * individual mirror failures degrade to "no maintainer activity" for that
 * repo rather than blocking the digest.
 */
export const useMaintainerMergedPrs = (
  repos: Repository[] | undefined,
  miners: MinerEvaluation[] | undefined,
): Map<string, MaintainerMergedPr[]> | undefined => {
  const cutRepos = useMemo(
    () =>
      (repos ?? []).filter(
        (repo) => parseNumber(repo.config?.maintainerCut ?? 0) > 0,
      ),
    [repos],
  );

  const maintainersData = useQueries({
    queries: cutRepos.map((repo) =>
      mirrorQuery<MirrorRepoMaintainersResponse>(
        `/repos/${repo.fullName}/maintainers`,
      ),
    ),
    combine: (results) =>
      results
        .map((result) => result.data)
        .filter((data): data is MirrorRepoMaintainersResponse => Boolean(data)),
  });

  // github_id -> { login, repos } for maintainers holding a live UID.
  const registeredMaintainers = useMemo(() => {
    if (!miners) return undefined;
    const registeredIds = new Set(
      miners.map((miner) => String(miner.githubId)),
    );
    const byId = new Map<string, { login: string; repos: Set<string> }>();
    for (const response of maintainersData) {
      const repoKey = response.repo_full_name?.toLowerCase();
      if (!repoKey) continue;
      for (const maintainer of response.maintainers ?? []) {
        const githubId = String(maintainer.github_id);
        if (!registeredIds.has(githubId)) continue;
        let entry = byId.get(githubId);
        if (!entry) {
          entry = { login: maintainer.login, repos: new Set() };
          byId.set(githubId, entry);
        }
        entry.repos.add(repoKey);
      }
    }
    return byId;
  }, [miners, maintainersData]);

  const maintainerIds = useMemo(
    () => Array.from(registeredMaintainers?.keys() ?? []),
    [registeredMaintainers],
  );

  const pullsData = useQueries({
    queries: maintainerIds.map((githubId) =>
      mirrorQuery<MirrorMinerPullsResponse>(`/miners/${githubId}/pulls`),
    ),
    combine: (results) =>
      results
        .map((result) => result.data)
        .filter((data): data is MirrorMinerPullsResponse => Boolean(data)),
  });

  return useMemo(() => {
    if (!registeredMaintainers) return undefined;
    const byRepo = new Map<string, MaintainerMergedPr[]>();
    for (const response of pullsData) {
      const maintainer = registeredMaintainers.get(String(response.github_id));
      if (!maintainer) continue;
      for (const pr of response.pull_requests ?? []) {
        const repoKey = pr.repo_full_name?.toLowerCase();
        if (!repoKey || !maintainer.repos.has(repoKey)) continue;
        if (pr.state !== 'MERGED' || !pr.merged_at) continue;
        let entries = byRepo.get(repoKey);
        if (!entries) {
          entries = [];
          byRepo.set(repoKey, entries);
        }
        entries.push({
          pullRequestNumber: pr.pr_number,
          mergedAt: pr.merged_at,
          author: maintainer.login,
        });
      }
    }
    return byRepo;
  }, [registeredMaintainers, pullsData]);
};
