import { RANK_COLORS } from '../../theme';

export interface MinerStats {
  id: string;
  githubId: string;
  author?: string;
  totalScore: number;
  baseTotalScore: number;
  totalPRs: number;
  totalIssues?: number;
  linesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  hotkey: string;
  rank?: number;
  uniqueReposCount?: number;
  credibility?: number;
  isEligible?: boolean;
  usdPerDay?: number;
  totalMergedPrs?: number;
  totalOpenPrs?: number;
  totalClosedPrs?: number;
  totalSolvedIssues?: number;
  totalOpenIssues?: number;
  totalClosedIssues?: number;
}

export type LeaderboardVariant = 'oss' | 'discoveries';

export type SortOption =
  | 'totalScore'
  | 'usdPerDay'
  | 'totalPRs'
  | 'totalIssues'
  | 'credibility';

export const FONTS = {
  mono: '"JetBrains Mono", monospace',
} as const;

export const getRankColors = (rank: number) => {
  if (rank === 1) return { color: RANK_COLORS.first, icon: '🥇' };
  if (rank === 2) return { color: RANK_COLORS.second, icon: '🥈' };
  if (rank === 3) return { color: RANK_COLORS.third, icon: '🥉' };
  return { color: 'rgba(255, 255, 255, 0.6)', icon: null };
};
