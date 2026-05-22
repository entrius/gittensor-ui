import {
  type MinerEvaluation,
  type RepositoryMiner,
} from '../api/models/Dashboard';
import { type MinerStats } from '../components/leaderboard/types';
import { parseNumber } from './ExplorerUtils';

/** Stable key for collapsing duplicate evaluation rows that share a GitHub id. */
const repositoryMinerDedupeKey = (row: RepositoryMiner): string => {
  const githubId = row.githubId?.trim();
  return githubId ? githubId : `eval:${row.id}`;
};

/**
 * The repo miners endpoint can return multiple `miner_evaluations` rows for the
 * same GitHub identity (e.g. hotkey changes). Keep the strongest row for the
 * active scoring track so the table shows one entry per miner.
 */
const dedupeRepositoryMinerRows = (
  rows: RepositoryMiner[],
  score: (row: RepositoryMiner) => number,
): RepositoryMiner[] => {
  const bestByKey = new Map<string, RepositoryMiner>();
  for (const row of rows) {
    const key = repositoryMinerDedupeKey(row);
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, row);
      continue;
    }
    const delta = score(row) - score(existing);
    if (delta > 0 || (delta === 0 && row.id > existing.id)) {
      bestByKey.set(key, row);
    }
  }
  return [...bestByKey.values()];
};

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

  const ranked = dedupeRepositoryMinerRows(rows, activeScore).sort((a, b) => {
    const byScore = activeScore(b) - activeScore(a);
    if (byScore !== 0) return byScore;
    return b.id - a.id;
  });

  return ranked.map((row, index) => {
    const totalSolvedIssues = parseNumber(row.totalSolvedIssues);
    const totalOpenIssues = parseNumber(row.totalOpenIssues);
    const totalClosedIssues = parseNumber(row.totalClosedIssues);

    return {
      // Evaluation row id — unique even when the API returns duplicate githubIds.
      id: String(row.id),
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
