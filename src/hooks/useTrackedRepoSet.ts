import { useMemo } from 'react';
import { useReposAndWeights } from '../api';

/**
 * Lowercase set of full names for every repository tracked by gittensor.
 *
 * Source of truth: GET /dash/repos. Use this whenever data fetched from
 * outside the gittensor API (e.g. the GitHub search endpoint) needs to be
 * narrowed down to repositories the subnet actually scores.
 */
export const useTrackedRepoSet = () => {
  const { data, isLoading, isError } = useReposAndWeights();
  const trackedRepos = useMemo(
    () => new Set((data ?? []).map((r) => r.fullName.toLowerCase())),
    [data],
  );
  return { trackedRepos, isLoading, isError };
};

export const isTrackedRepo = (
  trackedRepos: Set<string>,
  repoFullName: string | null | undefined,
): boolean => !!repoFullName && trackedRepos.has(repoFullName.toLowerCase());
