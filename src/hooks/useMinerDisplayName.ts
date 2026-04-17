import { useMinerGithubData, useMinerPRs } from '../api';
import { resolveMinerDisplayName } from '../utils';

/**
 * Canonical displayable name for a miner. Composes the two queries
 * `MinerScoreCard` already fetches, so adds no network cost when a detail
 * page mounts alongside it — just another react-query subscriber.
 */
export const useMinerDisplayName = (githubId: string): string => {
  const { data: githubData } = useMinerGithubData(githubId, !!githubId);
  const { data: prs } = useMinerPRs(githubId, !!githubId);
  return resolveMinerDisplayName(githubId, githubData, prs);
};
