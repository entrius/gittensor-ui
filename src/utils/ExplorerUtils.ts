import {
  type CommitLog,
  type MinerEvaluation,
  type Repository,
  type RepositoryPrScoring,
} from '../api';

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

export const calculateDynamicOpenPrThreshold = (
  minerStats: MinerEvaluation,
  prScoring: RepositoryPrScoring | undefined,
): number => {
  const baseThreshold = parseNumber(prScoring?.excessivePrPenaltyThreshold, 10);
  const tokenScorePer = parseNumber(prScoring?.openPrThresholdTokenScore, 300);
  const maxThreshold = parseNumber(prScoring?.maxOpenPrThreshold, 30);

  if (tokenScorePer <= 0) {
    return Math.min(baseThreshold, maxThreshold);
  }

  const tokenScore = parseNumber(minerStats.totalTokenScore);
  const bonus = Math.floor(tokenScore / tokenScorePer);

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

export type MinerStatusFilter = 'all' | 'open' | 'merged' | 'closed';

export interface RepoStats {
  repository: string;
  prs: number;
  score: number;
  tokenScore: number;
  weight: number;
}

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

// ---------------------------------------------------------------------------
// PR aggregation – builds per-repository stats from commit logs
// ---------------------------------------------------------------------------

export const aggregatePRsByRepository = (
  prs: CommitLog[],
  repoWeights: Map<string, number>,
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
// Filter / display helpers
// ---------------------------------------------------------------------------

export const hasActiveFilters = (searchQuery: string): boolean => {
  return !!searchQuery.trim();
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

export const filterBySearch = (
  stats: RepoStats[],
  searchQuery: string,
): RepoStats[] => {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return stats;
  return stats.filter((r) => r.repository.toLowerCase().includes(q));
};
