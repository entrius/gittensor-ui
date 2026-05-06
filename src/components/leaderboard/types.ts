import { RANK_COLORS, REPO_OWNER_AVATAR_BACKGROUNDS } from '../../theme';

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
  /**
   * Program-specific eligibility flags.
   *
   * These allow UI surfaces like Watchlist to disambiguate eligibility between
   * OSS contributions and Issue Discoveries without changing the default
   * `isEligible` semantics used across leaderboards.
   */
  ossIsEligible?: boolean;
  discoveriesIsEligible?: boolean;
  usdPerDay?: number;
  totalMergedPrs?: number;
  totalOpenPrs?: number;
  totalClosedPrs?: number;
  totalSolvedIssues?: number;
  totalOpenIssues?: number;
  totalClosedIssues?: number;
  issueDiscoveryScore?: number;
  issueCredibility?: number;
  isIssueEligible?: boolean;
}

export interface RepoStats {
  repository: string;
  totalScore: number;
  totalPRs: number;
  uniqueMiners: Set<string>;
  weight: number;
  rank?: number;
  inactiveAt?: string | null;
  /** Issue discovery track score (UI: "Issue score"; miner stats + merged multiplier PRs). */
  discoveryScore: number;
  /**
   * Completed/solved discovery issues (pro-rated — excludes open-issue totals).
   * Aligned with OSS row: merged PRs only.
   */
  discoveryIssues: number;
  /** Identities with non-zero pro-rated discovery score/issues in this repo. */
  discoveryContributors: Set<string>;
}

export type LeaderboardVariant = 'oss' | 'discoveries' | 'watchlist';

export type SortOption =
  | 'totalScore'
  | 'usdPerDay'
  | 'totalPRs'
  | 'totalIssues'
  | 'issueDiscoveryScore'
  | 'credibility'
  | 'watch';

export const FONTS = {
  mono: '"JetBrains Mono", monospace',
} as const;

export const getRankColors = (rank: number) => {
  if (rank === 1) return { color: RANK_COLORS.first, icon: '🥇' };
  if (rank === 2) return { color: RANK_COLORS.second, icon: '🥈' };
  if (rank === 3) return { color: RANK_COLORS.third, icon: '🥉' };
  // Resolved by MUI sx via the active palette so it follows light/dark mode.
  return { color: 'status.open' as const, icon: null };
};

export const getRepositoryOwnerAvatarBackground = (owner: string) => {
  if (owner === 'opentensor') return REPO_OWNER_AVATAR_BACKGROUNDS.opentensor;
  if (owner === 'bitcoin') return REPO_OWNER_AVATAR_BACKGROUNDS.bitcoin;
  return 'transparent';
};

export const headerCellStyle = {
  backgroundColor: 'surface.elevated',
  color: 'text.secondary',
  fontFamily: FONTS.mono,
  fontWeight: 500,
  fontSize: '0.75rem',
  borderBottom: '1px solid',
  borderColor: 'border.light',
  height: '48px',
  py: 1,
  boxSizing: 'border-box' as const,
};

export const bodyCellStyle = {
  color: 'text.primary',
  fontFamily: FONTS.mono,
  borderBottom: '1px solid',
  borderColor: 'border.light',
  fontSize: '0.75rem',
  py: 0.75,
  height: '52px',
  boxSizing: 'border-box' as const,
};
