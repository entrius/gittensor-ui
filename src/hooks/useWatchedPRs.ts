import { useMemo } from 'react';
import { useAllPrs, type CommitLog } from '../api';
import { useWatchlist, serializePRKey } from './useWatchlist';

export const matchesWatchedSet = (
  pr: CommitLog,
  starredKeys: Set<string>,
  watchedReposLowercase: Set<string>,
  watchedMinerIds: Set<string>,
): boolean =>
  starredKeys.has(serializePRKey(pr.repository, pr.pullRequestNumber)) ||
  watchedReposLowercase.has(pr.repository.toLowerCase()) ||
  (pr.githubId !== undefined && watchedMinerIds.has(pr.githubId));

export interface UseWatchedPRsResult {
  items: CommitLog[];
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

  const items = useMemo(() => {
    if (!allPrs) return [];
    return allPrs.filter((p) =>
      matchesWatchedSet(
        p,
        starredKeys,
        watchedReposLowercase,
        watchedMinerIdSet,
      ),
    );
  }, [allPrs, starredKeys, watchedReposLowercase, watchedMinerIdSet]);

  return { items, isLoading };
};
