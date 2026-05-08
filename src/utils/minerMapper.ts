import { type MinerEvaluation } from '../api/models/Dashboard';
import { type MinerStats } from '../components/leaderboard/types';
import { parseNumber } from './ExplorerUtils';

export function mapIssueDiscoveryMinerStats(
  allMinersStats: MinerEvaluation[],
): MinerStats[] {
  return allMinersStats.map((stat) => ({
    id: String(stat.id),
    githubId: stat.githubId || '',
    author: stat.githubUsername || undefined,
    totalScore: parseNumber(stat.issueDiscoveryScore),
    baseTotalScore: parseNumber(stat.baseTotalScore),
    totalPRs: parseNumber(stat.totalPrs),
    totalIssues:
      parseNumber(stat.totalSolvedIssues) +
      parseNumber(stat.totalOpenIssues) +
      parseNumber(stat.totalClosedIssues),
    linesChanged: parseNumber(stat.totalNodesScored),
    linesAdded: parseNumber(stat.totalAdditions),
    linesDeleted: parseNumber(stat.totalDeletions),
    hotkey: stat.hotkey || 'N/A',
    uniqueReposCount: parseNumber(stat.uniqueReposCount),
    credibility: parseNumber(stat.issueCredibility),
    issueCredibility: parseNumber(stat.issueCredibility),
    isEligible: stat.isIssueEligible ?? false,
    ossIsEligible: stat.isEligible ?? false,
    discoveriesIsEligible: stat.isIssueEligible ?? false,
    usdPerDay: parseNumber(stat.usdPerDay),
    totalMergedPrs: parseNumber(stat.totalMergedPrs),
    totalOpenPrs: parseNumber(stat.totalOpenPrs),
    totalClosedPrs: parseNumber(stat.totalClosedPrs),
    totalSolvedIssues: parseNumber(stat.totalSolvedIssues),
    totalOpenIssues: parseNumber(stat.totalOpenIssues),
    totalClosedIssues: parseNumber(stat.totalClosedIssues),
  }));
}

export const mapAllMinersToStats = (
  allMinersStats: MinerEvaluation[],
): MinerStats[] => {
  const rankById = new Map(
    [...allMinersStats]
      .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
      .map((stat, index) => [String(stat.id), index + 1]),
  );

  return allMinersStats.map((stat) => {
    const totalSolvedIssues = parseNumber(stat.totalSolvedIssues);
    const totalOpenIssues = parseNumber(stat.totalOpenIssues);
    const totalClosedIssues = parseNumber(stat.totalClosedIssues);

    return {
      id: String(stat.id),
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
      rank: rankById.get(String(stat.id)),
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
