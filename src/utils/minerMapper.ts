import { type MinerEvaluation } from '../api/models/Dashboard';
import { type MinerStats } from '../components/leaderboard/types';
import { parseNumber } from './ExplorerUtils';

export const mapAllMinersToStats = (
  allMinersStats: MinerEvaluation[],
): MinerStats[] => {
  const rankById = new Map(
    [...allMinersStats]
      .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
      .map((stat, index) => [String(stat.id), index + 1]),
  );

  return allMinersStats.map((stat) => ({
    id: String(stat.id),
    githubId: stat.githubId || '',
    author: stat.githubUsername || undefined,
    totalScore: parseNumber(stat.totalScore),
    baseTotalScore: parseNumber(stat.baseTotalScore),
    totalPRs: parseNumber(stat.totalPrs),
    linesChanged: parseNumber(stat.totalNodesScored),
    linesAdded: parseNumber(stat.totalAdditions),
    linesDeleted: parseNumber(stat.totalDeletions),
    hotkey: stat.hotkey || 'N/A',
    rank: rankById.get(String(stat.id)),
    uniqueReposCount: parseNumber(stat.uniqueReposCount),
    credibility: parseNumber(stat.credibility),
    isEligible: stat.isEligible ?? false,
    usdPerDay: parseNumber(stat.usdPerDay),
    totalMergedPrs: parseNumber(stat.totalMergedPrs),
    totalOpenPrs: parseNumber(stat.totalOpenPrs),
    totalClosedPrs: parseNumber(stat.totalClosedPrs),
  }));
};
