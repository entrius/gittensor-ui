import { TIER_COLORS } from '../../theme';
import { alpha } from '@mui/material';

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
        border: alpha(TIER_COLORS.gold, 0.5),
        text: TIER_COLORS.gold,
        bg: alpha(TIER_COLORS.gold, 0.1),
      };
    case 'Silver':
      return {
        border: alpha(TIER_COLORS.silver, 0.5),
        text: TIER_COLORS.silver,
        bg: alpha(TIER_COLORS.silver, 0.1),
      };
    case 'Bronze':
      return {
        border: alpha(TIER_COLORS.bronze, 0.5),
        text: TIER_COLORS.bronze,
        bg: alpha(TIER_COLORS.bronze, 0.1),
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
  if (rank === 1) return { color: TIER_COLORS.gold, icon: '🥇' };
  if (rank === 2) return { color: TIER_COLORS.silver, icon: '🥈' };
  if (rank === 3) return { color: TIER_COLORS.bronze, icon: '🥉' };
  return { color: 'rgba(255, 255, 255, 0.6)', icon: null };
};
