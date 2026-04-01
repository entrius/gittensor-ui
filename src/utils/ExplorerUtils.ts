import {
  type CommitLog,
  type MinerEvaluation,
  type Repository,
  type RepositoryPrScoring,
  type TierConfigResponse,
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

// ---------------------------------------------------------------------------
// Qualification filter
// ---------------------------------------------------------------------------

export type QualificationFilter = 'all' | 'qualified' | 'unqualified';

// ---------------------------------------------------------------------------
// Map builders – extract lookup maps from API data
// ---------------------------------------------------------------------------

export const buildRepoWeightsMap = (
  repos: Repository[] | undefined,
): Map<string, number> => {
  const map = new Map<string, number>();
  if (!Array.isArray(repos)) return map;
  for (const repo of repos) {
    if (repo && repo.fullName) {
      map.set(repo.fullName, parseFloat(repo.weight || '0'));
    }
  }
  return map;
};

export const buildRepoTiersMap = (
  repos: Repository[] | undefined,
): Map<string, string> => {
  const map = new Map<string, string>();
  if (!Array.isArray(repos)) return map;
  for (const repo of repos) {
    if (repo && repo.fullName) {
      map.set(repo.fullName, repo.tier || '');
    }
  }
  return map;
};

export const buildTierThresholdsMap = (
  tierConfig: TierConfigResponse | undefined,
): Map<string, number> => {
  const map = new Map<string, number>();
  if (!tierConfig?.tiers) return map;
  for (const t of tierConfig.tiers) {
    map.set(t.name.toLowerCase(), t.requiredMinTokenScorePerRepo);
  }
  return map;
};

// ---------------------------------------------------------------------------
// Qualification helpers
// ---------------------------------------------------------------------------

export const isRepoQualified = (
  repo: RepoStats,
  tierThresholds: Map<string, number>,
): boolean => {
  const tier = repo.tier.toLowerCase();
  const threshold = tierThresholds.get(tier);
  if (threshold == null) return false;
  return repo.tokenScore >= threshold;
};

export interface QualificationCounts {
  all: number;
  qualified: number;
  unqualified: number;
}

export const computeQualificationCounts = (
  repoStats: RepoStats[],
  tierThresholds: Map<string, number>,
): QualificationCounts => {
  let qualified = 0;
  let unqualified = 0;
  for (const repo of repoStats) {
    if (isRepoQualified(repo, tierThresholds)) {
      qualified++;
    } else {
      unqualified++;
    }
  }
  return { all: repoStats.length, qualified, unqualified };
};

// ---------------------------------------------------------------------------
// PR aggregation – builds per-repository stats from commit logs
// ---------------------------------------------------------------------------

export const aggregatePRsByRepository = (
  prs: CommitLog[],
  repoWeights: Map<string, number>,
  repoTiers: Map<string, string>,
): RepoStats[] => {
  if (!prs || prs.length === 0) return [];

  const statsMap = new Map<string, RepoStats>();

  for (const pr of prs) {
    const existing = statsMap.get(pr.repository) || {
      repository: pr.repository,
      prs: 0,
      score: 0,
      tokenScore: 0,
      weight: repoWeights.get(pr.repository) || 0,
      tier: repoTiers.get(pr.repository) || '',
    };
    existing.prs += 1;
    existing.score += parseFloat(pr.score || '0');
    if (pr.prState === 'MERGED') {
      existing.tokenScore += parseFloat(String(pr.tokenScore ?? '0'));
    }
    statsMap.set(pr.repository, existing);
  }

  return Array.from(statsMap.values());
};

// ---------------------------------------------------------------------------
// Tier counts
// ---------------------------------------------------------------------------

export interface TierCounts {
  all: number;
  gold: number;
  silver: number;
  bronze: number;
}

export const computeTierCounts = (repoStats: RepoStats[]): TierCounts => {
  const counts: TierCounts = {
    all: repoStats.length,
    gold: 0,
    silver: 0,
    bronze: 0,
  };
  for (const repo of repoStats) {
    const tier = repo.tier.toLowerCase();
    if (tier === 'gold') {
      counts.gold++;
    } else if (tier === 'silver') {
      counts.silver++;
    } else if (tier === 'bronze') {
      counts.bronze++;
    }
  }
  return counts;
};

// ---------------------------------------------------------------------------
// Filter / display helpers
// ---------------------------------------------------------------------------

export const hasActiveFilters = (
  tierFilter: MinerTierFilter,
  qualificationFilter: QualificationFilter,
  searchQuery: string,
): boolean => {
  return (
    tierFilter !== 'all' ||
    qualificationFilter !== 'all' ||
    !!searchQuery.trim()
  );
};

export const getDisplayCount = (
  filteredCount: number,
  totalCount: number,
  isFiltered: boolean,
): string => {
  if (isFiltered) {
    return `${filteredCount} of ${totalCount}`;
  }
  return String(filteredCount);
};

// ---------------------------------------------------------------------------
// Qualification-based filtering
// ---------------------------------------------------------------------------

export const filterByQualification = (
  stats: RepoStats[],
  qualificationFilter: QualificationFilter,
  tierThresholds: Map<string, number>,
): RepoStats[] => {
  switch (qualificationFilter) {
    case 'qualified':
      return stats.filter((r) => isRepoQualified(r, tierThresholds));
    case 'unqualified':
      return stats.filter((r) => !isRepoQualified(r, tierThresholds));
    case 'all':
    default:
      return stats;
  }
};

export const filterBySearch = (
  stats: RepoStats[],
  searchQuery: string,
): RepoStats[] => {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return stats;
  return stats.filter((r) => r.repository.toLowerCase().includes(q));
};
