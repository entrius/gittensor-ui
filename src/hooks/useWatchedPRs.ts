import { useMemo } from 'react';
import { useAllPrs, type CommitLog } from '../api';
import { useWatchlist, serializePRKey } from './useWatchlist';

export type WatchedPRSource = 'starred' | 'miner' | 'repo';

export const getWatchedSources = (
  pr: CommitLog,
  starredKeys: Set<string>,
  watchedReposLowercase: Set<string>,
  watchedMinerIds: Set<string>,
): WatchedPRSource[] => {
  const sources: WatchedPRSource[] = [];
  if (starredKeys.has(serializePRKey(pr.repository, pr.pullRequestNumber))) {
    sources.push('starred');
  }
  if (pr.githubId !== undefined && watchedMinerIds.has(pr.githubId)) {
    sources.push('miner');
  }
  if (watchedReposLowercase.has(pr.repository.toLowerCase())) {
    sources.push('repo');
  }
  return sources;
};

export const matchesWatchedSet = (
  pr: CommitLog,
  starredKeys: Set<string>,
  watchedReposLowercase: Set<string>,
  watchedMinerIds: Set<string>,
): boolean =>
  getWatchedSources(pr, starredKeys, watchedReposLowercase, watchedMinerIds)
    .length > 0;

export interface UseWatchedPRsResult {
  items: CommitLog[];
  sourcesByKey: Map<string, WatchedPRSource[]>;
  isLoading: boolean;
}

export const useWatchedPRs = (
  starredKeyList: string[],
): UseWatchedPRsResult => {
  const { data: allPrs, isLoading } = useAllPrs();
  const { ids: watchedMinerIds } = useWatchlist('miners');
  const { ids: watchedRepoIds } = useWatchlist('repos');

  const watchedMinerIdSet = useMemo(
    () => new Set(watchedMinerIds),
    [watchedMinerIds],
  );

  const watchedReposLowercase = useMemo(
    () => new Set(watchedRepoIds.map((r) => r.toLowerCase())),
    [watchedRepoIds],
  );

  const starredKeys = useMemo(() => new Set(starredKeyList), [starredKeyList]);

  const { items, sourcesByKey } = useMemo(() => {
    const filtered: CommitLog[] = [];
    const map = new Map<string, WatchedPRSource[]>();
    if (!allPrs) return { items: filtered, sourcesByKey: map };
    for (const p of allPrs) {
      const sources = getWatchedSources(
        p,
        starredKeys,
        watchedReposLowercase,
        watchedMinerIdSet,
      );
      if (sources.length === 0) continue;
      filtered.push(p);
      map.set(serializePRKey(p.repository, p.pullRequestNumber), sources);
    }
    return { items: filtered, sourcesByKey: map };
  }, [allPrs, starredKeys, watchedReposLowercase, watchedMinerIdSet]);

  return { items, sourcesByKey, isLoading };
};
