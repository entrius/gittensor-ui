import { useMemo } from 'react';
import { useAllPrs, useAllMiners, useReposAndWeights } from '../api';
import type {
  CommitLog,
  MinerEvaluation,
  Repository,
} from '../api/models/Dashboard';
import { buildRepoDiscoveryRollupFromMiners } from '../utils/ExplorerUtils';
import { isMergedPr } from '../utils/prStatus';
import type { RepoStats } from '../components/leaderboard/types';

export function computeRepositoryLeaderboardStats(
  allPRs: CommitLog[] | undefined,
  allMiners: MinerEvaluation[] | undefined,
  reposWithWeights: Repository[] | undefined,
): RepoStats[] {
  if (!reposWithWeights) return [];

  const prStatsMap = new Map<
    string,
    { totalScore: number; totalPRs: number; uniqueMiners: Set<string> }
  >();

  if (allPRs) {
    allPRs.forEach((pr: CommitLog) => {
      if (!pr?.repository) return;
      if (!isMergedPr(pr)) return;

      const repoKey = pr.repository.toLowerCase();
      const cur = prStatsMap.get(repoKey) || {
        totalScore: 0,
        totalPRs: 0,
        uniqueMiners: new Set<string>(),
      };
      cur.totalScore += parseFloat(pr.score || '0');
      cur.totalPRs += 1;
      if (pr.author) cur.uniqueMiners.add(pr.author);
      prStatsMap.set(repoKey, cur);
    });
  }

  const discoveryByRepo = buildRepoDiscoveryRollupFromMiners(allPRs, allMiners);

  return reposWithWeights
    .map((repo) => {
      const key = repo.fullName.toLowerCase();
      const s = prStatsMap.get(key);
      const d = discoveryByRepo.get(key);
      return {
        repository: repo.fullName,
        totalScore: s?.totalScore || 0,
        totalPRs: s?.totalPRs || 0,
        uniqueMiners: s?.uniqueMiners || new Set<string>(),
        weight: repo.weight ? parseFloat(String(repo.weight)) : 0,
        inactiveAt: repo.inactiveAt,
        discoveryScore: d?.discoveryScore ?? 0,
        discoveryIssues: d?.discoveryIssues ?? 0,
        discoveryContributors: d?.discoveryContributors ?? new Set<string>(),
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}

export function useRepositoryLeaderboardStats(): {
  repoStats: RepoStats[];
  isLoading: boolean;
} {
  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: allMiners, isLoading: isLoadingMiners } = useAllMiners();
  const { data: reposWithWeights, isLoading: isLoadingRepos } =
    useReposAndWeights();

  const isLoading = isLoadingPRs || isLoadingRepos || isLoadingMiners;

  const repoStats = useMemo(
    () =>
      computeRepositoryLeaderboardStats(allPRs, allMiners, reposWithWeights),
    [allPRs, allMiners, reposWithWeights],
  );

  return { repoStats, isLoading };
}
