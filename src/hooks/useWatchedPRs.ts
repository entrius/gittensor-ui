import { useMemo } from 'react';
import { useAllMiners, useAllPrs, type CommitLog } from '../api';
import { useWatchlist, serializePRKey } from './useWatchlist';

export interface UseWatchedPRsResult {
  items: CommitLog[];
  isLoading: boolean;
}

interface MinerLike {
  githubId?: string;
  hotkey?: string;
}

export function resolveWatchedMinerHotkeys(
  allMiners: MinerLike[] | undefined,
  watchedMinerIds: string[],
): Set<string> {
  if (!allMiners || watchedMinerIds.length === 0) return new Set<string>();
  const watchedSet = new Set(watchedMinerIds);
  const hotkeys = new Set<string>();
  for (const m of allMiners) {
    if (m.githubId && watchedSet.has(m.githubId) && m.hotkey) {
      hotkeys.add(m.hotkey);
    }
  }
  return hotkeys;
}

export function matchesWatchedSet(
  pr: CommitLog,
  starredKeys: Set<string>,
  watchedRepos: Set<string>,
  watchedMinerHotkeys: Set<string>,
): boolean {
  return (
    starredKeys.has(serializePRKey(pr.repository, pr.pullRequestNumber)) ||
    watchedRepos.has(pr.repository.toLowerCase()) ||
    watchedMinerHotkeys.has(pr.hotkey)
  );
}

export function useWatchedPRs(starredKeyList: string[]): UseWatchedPRsResult {
  const { data: allPrs, isLoading } = useAllPrs();
  const { ids: watchedMinerIds } = useWatchlist('miners');
  const { ids: watchedRepoIds } = useWatchlist('repos');
  const { data: allMiners } = useAllMiners();

  const watchedMinerHotkeys = useMemo(
    () => resolveWatchedMinerHotkeys(allMiners, watchedMinerIds),
    [allMiners, watchedMinerIds],
  );

  const watchedRepoSet = useMemo(
    () => new Set(watchedRepoIds.map((r) => r.toLowerCase())),
    [watchedRepoIds],
  );

  const starredKeys = useMemo(() => new Set(starredKeyList), [starredKeyList]);

  const items = useMemo(() => {
    if (!allPrs) return [] as CommitLog[];
    return allPrs.filter((pr) =>
      matchesWatchedSet(pr, starredKeys, watchedRepoSet, watchedMinerHotkeys),
    );
  }, [allPrs, starredKeys, watchedRepoSet, watchedMinerHotkeys]);

  return { items, isLoading };
}
