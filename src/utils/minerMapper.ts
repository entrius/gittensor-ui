import {
  type MinerEvaluation,
  type RepositoryMiner,
} from '../api/models/Dashboard';
import { type MinerStats } from '../components/leaderboard/types';
import { parseNumber } from './ExplorerUtils';

export const mapAllMinersToStats = (
  allMinersStats: MinerEvaluation[],
): MinerStats[] => {
  const rankByGithubId = new Map(
    [...allMinersStats]
      .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
      .map((stat, index) => [stat.githubId, index + 1]),
  );

  return allMinersStats.map((stat) => {
    const totalSolvedIssues = parseNumber(stat.totalSolvedIssues);
    const totalOpenIssues = parseNumber(stat.totalOpenIssues);
    const totalClosedIssues = parseNumber(stat.totalClosedIssues);

    return {
      // The leaderboard endpoint aggregates per-repo evaluation rows and no
      // longer returns a row `id`; `githubId` is unique per active miner.
      id: stat.githubId || '',
      githubId: stat.githubId || '',
      author: stat.githubUsername || undefined,
      totalScore: parseNumber(stat.totalScore),
      baseTotalScore: parseNumber(stat.baseTotalScore),
      totalPRs: parseNumber(stat.totalPrs),
      totalIssues: totalSolvedIssues + totalOpenIssues + totalClosedIssues,
      linesChanged: parseNumber(stat.totalNodesScored),
      linesAdded: parseNumber(stat.totalAdditions),
      linesDeleted: parseNumber(stat.totalDeletions),
      hotkey: stat.hotkey || 'N/A',
      rank: rankByGithubId.get(stat.githubId),
      uniqueReposCount: parseNumber(stat.uniqueReposCount),
      credibility: parseNumber(stat.credibility),
      isEligible: stat.isEligible ?? false,
      ossIsEligible: stat.isEligible ?? false,
      discoveriesIsEligible: stat.isIssueEligible ?? false,
      usdPerDay: parseNumber(stat.usdPerDay),
      totalMergedPrs: parseNumber(stat.totalMergedPrs),
      totalOpenPrs: parseNumber(stat.totalOpenPrs),
      totalClosedPrs: parseNumber(stat.totalClosedPrs),
      totalSolvedIssues,
      totalOpenIssues,
      totalClosedIssues,
      issueDiscoveryScore: parseNumber(stat.issueDiscoveryScore),
      issueCredibility: parseNumber(stat.issueCredibility),
      isIssueEligible: stat.isIssueEligible ?? false,
    };
  });
};

/**
 * Map per-repository miner evaluation rows (`GET /repos/:repo/miners`) into
 * leaderboard `MinerStats`, scoped to a single repository. `mode` selects
 * which per-repo track drives `totalScore` / `credibility` / `isEligible`;
 * the result is sorted by that score so ranks line up with row order.
 */
export const mapRepositoryMinersToStats = (
  rows: RepositoryMiner[],
  mode: 'oss' | 'discoveries',
): MinerStats[] => {
  const isDiscovery = mode === 'discoveries';
  const activeScore = (row: RepositoryMiner): number =>
    isDiscovery
      ? parseNumber(row.issueDiscoveryScore)
      : parseNumber(row.totalScore);

  const ranked = [...rows].sort((a, b) => activeScore(b) - activeScore(a));

  return ranked.map((row, index) => {
    const totalSolvedIssues = parseNumber(row.totalSolvedIssues);
    const totalOpenIssues = parseNumber(row.totalOpenIssues);
    const totalClosedIssues = parseNumber(row.totalClosedIssues);

    return {
      id: row.githubId || '',
      githubId: row.githubId || '',
      author: row.githubUsername || undefined,
      totalScore: activeScore(row),
      baseTotalScore: parseNumber(row.baseTotalScore),
      totalPRs: parseNumber(row.totalPrs),
      totalIssues: totalSolvedIssues + totalOpenIssues + totalClosedIssues,
      linesChanged: parseNumber(row.totalNodesScored),
      linesAdded: 0,
      linesDeleted: 0,
      hotkey: row.hotkey || 'N/A',
      rank: index + 1,
      uniqueReposCount: parseNumber(row.uniqueReposCount),
      credibility: isDiscovery
        ? parseNumber(row.issueCredibility)
        : parseNumber(row.credibility),
      isEligible: isDiscovery
        ? (row.isIssueEligible ?? false)
        : (row.isEligible ?? false),
      ossIsEligible: row.isEligible ?? false,
      discoveriesIsEligible: row.isIssueEligible ?? false,
      usdPerDay: parseNumber(row.usdPerDay),
      totalMergedPrs: parseNumber(row.totalMergedPrs),
      totalOpenPrs: parseNumber(row.totalOpenPrs),
      totalClosedPrs: parseNumber(row.totalClosedPrs),
      totalSolvedIssues,
      totalOpenIssues,
      totalClosedIssues,
      issueDiscoveryScore: parseNumber(row.issueDiscoveryScore),
      issueCredibility: parseNumber(row.issueCredibility),
      isIssueEligible: row.isIssueEligible ?? false,
    };
  });
};
