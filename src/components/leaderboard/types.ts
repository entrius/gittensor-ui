import { TIER_COLORS } from '../../theme';

export interface MinerStats {
  githubId: string;
  author?: string;
  totalScore: number;
  baseTotalScore: number;
  totalPRs: number;
  linesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  hotkey: string;
  rank?: number;
  uniqueReposCount?: number;
  credibility?: number;
  currentTier?: string;
  usdPerDay?: number;
  totalMergedPrs?: number;
  totalOpenPrs?: number;
  totalClosedPrs?: number;
}

export type SortOption =
  | 'totalScore'
  | 'usdPerDay'
  | 'totalPRs'
  | 'credibility';
export type TierFilter = 'all' | 'Gold' | 'Silver' | 'Bronze';

export const FONTS = {
  mono: '"JetBrains Mono", monospace',
  // Use mono font consistently for data-driven UI
} as const;

export interface TierColorSet {
  border: string;
  text: string;
  bg: string;
}

export const getTierColors = (tier: string | undefined): TierColorSet => {
  switch (tier) {
    case 'Gold':
      return {
        border: 'rgba(255, 215, 0, 0.5)',
        text: TIER_COLORS.gold,
        bg: 'rgba(255, 215, 0, 0.1)',
      };
    case 'Silver':
      return {
        border: 'rgba(192, 192, 192, 0.5)',
        text: TIER_COLORS.silver,
        bg: 'rgba(192, 192, 192, 0.1)',
      };
    case 'Bronze':
      return {
        border: 'rgba(205, 127, 50, 0.5)',
        text: TIER_COLORS.bronze,
        bg: 'rgba(205, 127, 50, 0.1)',
      };
    default:
      return {
        border: 'rgba(255, 255, 255, 0.15)',
        text: 'rgba(255, 255, 255, 0.5)',
        bg: 'rgba(255, 255, 255, 0.02)',
      };
  }
};

export const getRankColors = (rank: number) => {
  if (rank === 1) return { color: '#FFD700', icon: '🥇' };
  if (rank === 2) return { color: '#C0C0C0', icon: '🥈' };
  if (rank === 3) return { color: '#CD7F32', icon: '🥉' };
  return { color: 'rgba(255, 255, 255, 0.6)', icon: null };
};
