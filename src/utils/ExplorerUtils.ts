import {
  type CommitLog,
  type MinerEvaluation,
  type RepositoryPrScoring,
} from '../api';

export const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

export const getGithubAvatarSrc = (username?: string | null) => {
  if (username) {
    return `https://avatars.githubusercontent.com/${username}`;
  }

  return '';
};

// Parses numeric-like values and falls back when the value is missing or invalid.
export const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
};

export const getTierLevel = (tier: string | undefined | null): number => {
  if (!tier) return 0;
  return TIER_LEVELS[tier.toLowerCase()] || 0;
};

const getUnlockedTierTokenScore = (minerStats: MinerEvaluation): number => {
  const tierLevel = getTierLevel(minerStats.currentTier);
  let total = 0;

  if (tierLevel >= 1) total += parseNumber(minerStats.bronzeTokenScore);
  if (tierLevel >= 2) total += parseNumber(minerStats.silverTokenScore);
  if (tierLevel >= 3) total += parseNumber(minerStats.goldTokenScore);

  return total;
};

export const calculateDynamicOpenPrThreshold = (
  minerStats: MinerEvaluation,
  prScoring: RepositoryPrScoring | undefined,
): number => {
  const baseThreshold = parseNumber(prScoring?.excessivePrPenaltyThreshold, 10);
  const tokenScorePer = parseNumber(prScoring?.openPrThresholdTokenScore, 500);
  const maxThreshold = parseNumber(prScoring?.maxOpenPrThreshold, 30);

  if (tokenScorePer <= 0) {
    return Math.min(baseThreshold, maxThreshold);
  }

  const unlockedTokenScore = getUnlockedTierTokenScore(minerStats);
  const bonus = Math.floor(unlockedTokenScore / tokenScorePer);

  return Math.min(baseThreshold + bonus, maxThreshold);
};

const isMinerEvaluationLike = (value: unknown): value is MinerEvaluation => {
  if (!value || typeof value !== 'object') return false;
  return 'githubId' in value;
};

export const normalizeMinerEvaluations = (
  payload: unknown,
): MinerEvaluation[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isMinerEvaluationLike);
  }

  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  const keyedList = ['items', 'miners', 'results', 'data']
    .map((key) => record[key])
    .find((value) => Array.isArray(value));

  if (Array.isArray(keyedList)) {
    return keyedList.filter(isMinerEvaluationLike);
  }

  const objectValues = Object.values(record);
  if (objectValues.length > 0 && objectValues.every(isMinerEvaluationLike)) {
    return objectValues;
  }

  return [];
};

const isCommitLogLike = (value: unknown): value is CommitLog => {
  if (!value || typeof value !== 'object') return false;
  return 'repository' in value && 'pullRequestNumber' in value;
};

export const normalizeCommitLogs = (payload: unknown): CommitLog[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isCommitLogLike);
  }

  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  const keyedList = ['items', 'prs', 'results', 'data']
    .map((key) => record[key])
    .find((value) => Array.isArray(value));

  if (Array.isArray(keyedList)) {
    return keyedList.filter(isCommitLogLike);
  }

  const objectValues = Object.values(record);
  if (objectValues.length > 0 && objectValues.every(isCommitLogLike)) {
    return objectValues;
  }

  return [];
};

export type MinerTierFilter = 'all' | 'gold' | 'silver' | 'bronze';
export type MinerStatusFilter = 'all' | 'open' | 'merged' | 'closed';

export const formatTierLabel = (tier: string | undefined | null): string => {
  if (!tier) return 'Unknown';
  const normalized = tier.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const tierColorFor = (
  tier: string | undefined | null,
  tierColors: { gold: string; silver: string; bronze: string },
): string => {
  if (!tier) return 'transparent';
  const normalized = tier.toLowerCase();
  switch (normalized) {
    case 'gold':
      return tierColors.gold;
    case 'silver':
      return tierColors.silver;
    case 'bronze':
      return tierColors.bronze;
    default:
      return 'transparent';
  }
};

export const getTierFilterValue = (
  tier: string | undefined | null,
): MinerTierFilter => {
  if (!tier) return 'all';
  const normalized = tier.toLowerCase();
  if (
    normalized === 'gold' ||
    normalized === 'silver' ||
    normalized === 'bronze'
  ) {
    return normalized;
  }
  return 'all';
};

export interface RepoStats {
  repository: string;
  prs: number;
  score: number;
  tokenScore: number;
  weight: number;
  tier: string;
}

export const filterMinerRepoStats = (
  stats: RepoStats[],
  tierFilter: MinerTierFilter,
): RepoStats[] => {
  if (tierFilter === 'all') return stats;
  return stats.filter(
    (repo) => repo.tier.toLowerCase() === tierFilter.toLowerCase(),
  );
};

export type RepoSortField =
  | 'rank'
  | 'repository'
  | 'prs'
  | 'score'
  | 'tokenScore'
  | 'weight';
export type SortOrder = 'asc' | 'desc';

export const sortMinerRepoStats = (
  stats: RepoStats[],
  field: RepoSortField,
  order: SortOrder,
): RepoStats[] => {
  const sorted = [...stats];
  sorted.sort((a, b) => {
    let compareValue = 0;
    switch (field) {
      case 'repository':
        compareValue = a.repository.localeCompare(b.repository);
        break;
      case 'prs':
        compareValue = a.prs - b.prs;
        break;
      case 'score':
        compareValue = a.score - b.score;
        break;
      case 'tokenScore':
        compareValue = a.tokenScore - b.tokenScore;
        break;
      case 'weight':
        compareValue = a.weight - b.weight;
        break;
      case 'rank':
        compareValue = a.score - b.score;
        break;
    }
    return order === 'asc' ? compareValue : -compareValue;
  });
  return sorted;
};

export interface PrTierCounts {
  all: number;
  gold: number;
  silver: number;
  bronze: number;
}

export const countPrTiers = <
  T extends { tier?: string | null; repository: string },
>(
  prs: T[],
  repoTiers: Map<string, string>,
): PrTierCounts => {
  const counts: PrTierCounts = { all: 0, gold: 0, silver: 0, bronze: 0 };
  for (const pr of prs) {
    counts.all++;
    const tier = pr.tier || repoTiers.get(pr.repository) || '';
    const normalized = tier.toLowerCase();
    if (normalized === 'gold') counts.gold++;
    else if (normalized === 'silver') counts.silver++;
    else if (normalized === 'bronze') counts.bronze++;
  }
  return counts;
};

export const filterPrsByTier = <
  T extends { tier?: string | null; repository: string },
>(
  prs: T[],
  tierFilter: MinerTierFilter,
  repoTiers: Map<string, string>,
): T[] => {
  if (tierFilter === 'all') return prs;
  return prs.filter((pr) => {
    const tier = pr.tier || repoTiers.get(pr.repository) || '';
    return tier.toLowerCase() === tierFilter.toLowerCase();
  });
};
