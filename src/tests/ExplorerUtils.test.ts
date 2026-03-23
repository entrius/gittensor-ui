import { describe, it, expect } from 'vitest';
import {
  parseNumber,
  getTierLevel,
  calculateDynamicOpenPrThreshold,
  normalizeMinerEvaluations,
  normalizeCommitLogs,
  formatTierLabel,
  tierColorFor,
  getTierFilterValue,
  filterMinerRepoStats,
  sortMinerRepoStats,
  countPrTiers,
  filterPrsByTier,
  type RepoStats,
} from '../utils/ExplorerUtils';

describe('parseNumber', () => {
  it('returns number when given a valid number', () => {
    expect(parseNumber(42)).toBe(42);
    expect(parseNumber(3.14)).toBe(3.14);
    expect(parseNumber(0)).toBe(0);
  });

  it('parses valid string numbers', () => {
    expect(parseNumber('42')).toBe(42);
    expect(parseNumber('3.14')).toBe(3.14);
    expect(parseNumber('  100  ')).toBe(100);
  });

  it('returns fallback for invalid values', () => {
    expect(parseNumber(null)).toBe(0);
    expect(parseNumber(undefined)).toBe(0);
    expect(parseNumber('abc')).toBe(0);
    expect(parseNumber('')).toBe(0);
    expect(parseNumber(NaN)).toBe(0);
    expect(parseNumber(Infinity)).toBe(0);
  });

  it('uses custom fallback', () => {
    expect(parseNumber(null, 10)).toBe(10);
    expect(parseNumber('invalid', -1)).toBe(-1);
  });
});

describe('getTierLevel', () => {
  it('returns correct level for valid tiers', () => {
    expect(getTierLevel('bronze')).toBe(1);
    expect(getTierLevel('silver')).toBe(2);
    expect(getTierLevel('gold')).toBe(3);
  });

  it('handles case insensitivity', () => {
    expect(getTierLevel('GOLD')).toBe(3);
    expect(getTierLevel('Silver')).toBe(2);
    expect(getTierLevel('BRONZE')).toBe(1);
  });

  it('returns 0 for invalid or missing tiers', () => {
    expect(getTierLevel(null)).toBe(0);
    expect(getTierLevel(undefined)).toBe(0);
    expect(getTierLevel('')).toBe(0);
    expect(getTierLevel('platinum')).toBe(0);
  });
});

describe('formatTierLabel', () => {
  it('capitalizes tier names', () => {
    expect(formatTierLabel('gold')).toBe('Gold');
    expect(formatTierLabel('silver')).toBe('Silver');
    expect(formatTierLabel('bronze')).toBe('Bronze');
  });

  it('handles mixed case input', () => {
    expect(formatTierLabel('GOLD')).toBe('Gold');
    expect(formatTierLabel('SiLvEr')).toBe('Silver');
  });

  it('returns Unknown for invalid input', () => {
    expect(formatTierLabel(null)).toBe('Unknown');
    expect(formatTierLabel(undefined)).toBe('Unknown');
    expect(formatTierLabel('')).toBe('Unknown');
  });
});

describe('tierColorFor', () => {
  const tierColors = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
  };

  it('returns correct color for tiers', () => {
    expect(tierColorFor('gold', tierColors)).toBe('#FFD700');
    expect(tierColorFor('silver', tierColors)).toBe('#C0C0C0');
    expect(tierColorFor('bronze', tierColors)).toBe('#CD7F32');
  });

  it('handles case insensitivity', () => {
    expect(tierColorFor('GOLD', tierColors)).toBe('#FFD700');
    expect(tierColorFor('Silver', tierColors)).toBe('#C0C0C0');
  });

  it('returns transparent for invalid tiers', () => {
    expect(tierColorFor(null, tierColors)).toBe('transparent');
    expect(tierColorFor(undefined, tierColors)).toBe('transparent');
    expect(tierColorFor('platinum', tierColors)).toBe('transparent');
  });
});

describe('getTierFilterValue', () => {
  it('returns correct filter value for valid tiers', () => {
    expect(getTierFilterValue('gold')).toBe('gold');
    expect(getTierFilterValue('silver')).toBe('silver');
    expect(getTierFilterValue('bronze')).toBe('bronze');
  });

  it('handles case insensitivity', () => {
    expect(getTierFilterValue('GOLD')).toBe('gold');
    expect(getTierFilterValue('Silver')).toBe('silver');
  });

  it('returns all for invalid tiers', () => {
    expect(getTierFilterValue(null)).toBe('all');
    expect(getTierFilterValue(undefined)).toBe('all');
    expect(getTierFilterValue('platinum')).toBe('all');
  });
});

describe('filterMinerRepoStats', () => {
  const mockStats: RepoStats[] = [
    { repository: 'repo1', prs: 5, score: 100, tokenScore: 80, weight: 0.5, tier: 'gold' },
    { repository: 'repo2', prs: 3, score: 50, tokenScore: 40, weight: 0.3, tier: 'silver' },
    { repository: 'repo3', prs: 2, score: 25, tokenScore: 20, weight: 0.2, tier: 'bronze' },
    { repository: 'repo4', prs: 4, score: 75, tokenScore: 60, weight: 0.4, tier: 'Gold' },
  ];

  it('returns all stats when filter is all', () => {
    expect(filterMinerRepoStats(mockStats, 'all')).toEqual(mockStats);
  });

  it('filters by gold tier', () => {
    const result = filterMinerRepoStats(mockStats, 'gold');
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.tier.toLowerCase() === 'gold')).toBe(true);
  });

  it('filters by silver tier', () => {
    const result = filterMinerRepoStats(mockStats, 'silver');
    expect(result).toHaveLength(1);
    expect(result[0].repository).toBe('repo2');
  });

  it('filters by bronze tier', () => {
    const result = filterMinerRepoStats(mockStats, 'bronze');
    expect(result).toHaveLength(1);
    expect(result[0].repository).toBe('repo3');
  });
});

describe('sortMinerRepoStats', () => {
  const mockStats: RepoStats[] = [
    { repository: 'beta', prs: 5, score: 100, tokenScore: 80, weight: 0.5, tier: 'gold' },
    { repository: 'alpha', prs: 3, score: 50, tokenScore: 40, weight: 0.3, tier: 'silver' },
    { repository: 'gamma', prs: 2, score: 75, tokenScore: 60, weight: 0.2, tier: 'bronze' },
  ];

  it('sorts by repository name ascending', () => {
    const result = sortMinerRepoStats(mockStats, 'repository', 'asc');
    expect(result[0].repository).toBe('alpha');
    expect(result[1].repository).toBe('beta');
    expect(result[2].repository).toBe('gamma');
  });

  it('sorts by repository name descending', () => {
    const result = sortMinerRepoStats(mockStats, 'repository', 'desc');
    expect(result[0].repository).toBe('gamma');
    expect(result[2].repository).toBe('alpha');
  });

  it('sorts by prs ascending', () => {
    const result = sortMinerRepoStats(mockStats, 'prs', 'asc');
    expect(result[0].prs).toBe(2);
    expect(result[2].prs).toBe(5);
  });

  it('sorts by score descending', () => {
    const result = sortMinerRepoStats(mockStats, 'score', 'desc');
    expect(result[0].score).toBe(100);
    expect(result[2].score).toBe(50);
  });

  it('sorts by weight ascending', () => {
    const result = sortMinerRepoStats(mockStats, 'weight', 'asc');
    expect(result[0].weight).toBe(0.2);
    expect(result[2].weight).toBe(0.5);
  });

  it('does not mutate original array', () => {
    const original = [...mockStats];
    sortMinerRepoStats(mockStats, 'score', 'desc');
    expect(mockStats).toEqual(original);
  });
});

describe('countPrTiers', () => {
  const repoTiers = new Map([
    ['repo1', 'gold'],
    ['repo2', 'silver'],
    ['repo3', 'bronze'],
  ]);

  it('counts PRs by tier from PR tier property', () => {
    const prs = [
      { repository: 'repo1', tier: 'gold' },
      { repository: 'repo2', tier: 'gold' },
      { repository: 'repo3', tier: 'silver' },
    ];
    const counts = countPrTiers(prs, new Map());
    expect(counts.all).toBe(3);
    expect(counts.gold).toBe(2);
    expect(counts.silver).toBe(1);
    expect(counts.bronze).toBe(0);
  });

  it('falls back to repo tier when PR tier is missing', () => {
    const prs = [
      { repository: 'repo1', tier: null },
      { repository: 'repo2', tier: undefined },
      { repository: 'repo3' },
    ];
    const counts = countPrTiers(prs, repoTiers);
    expect(counts.all).toBe(3);
    expect(counts.gold).toBe(1);
    expect(counts.silver).toBe(1);
    expect(counts.bronze).toBe(1);
  });

  it('handles empty array', () => {
    const counts = countPrTiers([], repoTiers);
    expect(counts.all).toBe(0);
    expect(counts.gold).toBe(0);
    expect(counts.silver).toBe(0);
    expect(counts.bronze).toBe(0);
  });
});

describe('filterPrsByTier', () => {
  const repoTiers = new Map([
    ['repo1', 'gold'],
    ['repo2', 'silver'],
  ]);

  const prs = [
    { repository: 'repo1', tier: 'gold' },
    { repository: 'repo2', tier: null },
    { repository: 'repo3', tier: 'bronze' },
  ];

  it('returns all PRs when filter is all', () => {
    expect(filterPrsByTier(prs, 'all', repoTiers)).toEqual(prs);
  });

  it('filters by PR tier property', () => {
    const result = filterPrsByTier(prs, 'gold', repoTiers);
    expect(result).toHaveLength(1);
    expect(result[0].repository).toBe('repo1');
  });

  it('falls back to repo tier when PR tier is missing', () => {
    const result = filterPrsByTier(prs, 'silver', repoTiers);
    expect(result).toHaveLength(1);
    expect(result[0].repository).toBe('repo2');
  });

  it('filters bronze tier', () => {
    const result = filterPrsByTier(prs, 'bronze', repoTiers);
    expect(result).toHaveLength(1);
    expect(result[0].repository).toBe('repo3');
  });
});

describe('calculateDynamicOpenPrThreshold', () => {
  const baseMiner = {
    githubId: 'test',
    currentTier: 'bronze',
    bronzeTokenScore: 600,
    silverTokenScore: 0,
    goldTokenScore: 0,
  } as any;

  it('returns default threshold with bonus when no scoring config', () => {
    // defaults: base=10, tokenScorePer=500, max=30; 600/500=1 bonus → 11
    expect(calculateDynamicOpenPrThreshold(baseMiner, undefined)).toBe(11);
  });

  it('calculates bonus from token score', () => {
    const scoring = {
      excessivePrPenaltyThreshold: 10,
      openPrThresholdTokenScore: 500,
      maxOpenPrThreshold: 30,
    } as any;
    // 600 / 500 = 1 bonus → 10 + 1 = 11
    expect(calculateDynamicOpenPrThreshold(baseMiner, scoring)).toBe(11);
  });

  it('caps at max threshold', () => {
    const highMiner = {
      ...baseMiner,
      currentTier: 'gold',
      bronzeTokenScore: 5000,
      silverTokenScore: 5000,
      goldTokenScore: 5000,
    } as any;
    const scoring = {
      excessivePrPenaltyThreshold: 10,
      openPrThresholdTokenScore: 500,
      maxOpenPrThreshold: 30,
    } as any;
    expect(calculateDynamicOpenPrThreshold(highMiner, scoring)).toBe(30);
  });

  it('returns base when tokenScorePer is 0', () => {
    const scoring = {
      excessivePrPenaltyThreshold: 8,
      openPrThresholdTokenScore: 0,
      maxOpenPrThreshold: 30,
    } as any;
    expect(calculateDynamicOpenPrThreshold(baseMiner, scoring)).toBe(8);
  });
});

describe('normalizeMinerEvaluations', () => {
  it('returns array directly if items have githubId', () => {
    const arr = [{ githubId: 'a' }, { githubId: 'b' }];
    expect(normalizeMinerEvaluations(arr)).toEqual(arr);
  });

  it('extracts from keyed object (items)', () => {
    const payload = { items: [{ githubId: 'x' }] };
    expect(normalizeMinerEvaluations(payload)).toEqual([{ githubId: 'x' }]);
  });

  it('returns empty array for null/undefined', () => {
    expect(normalizeMinerEvaluations(null)).toEqual([]);
    expect(normalizeMinerEvaluations(undefined)).toEqual([]);
  });

  it('returns empty array for non-matching structure', () => {
    expect(normalizeMinerEvaluations({ foo: 'bar' })).toEqual([]);
  });

  it('handles object values as miners', () => {
    const payload = { m1: { githubId: 'a' }, m2: { githubId: 'b' } };
    const result = normalizeMinerEvaluations(payload);
    expect(result).toHaveLength(2);
  });
});

describe('normalizeCommitLogs', () => {
  it('returns array directly if items have repository and pullRequestNumber', () => {
    const arr = [{ repository: 'r', pullRequestNumber: 1 }];
    expect(normalizeCommitLogs(arr)).toEqual(arr);
  });

  it('extracts from keyed object (prs)', () => {
    const payload = { prs: [{ repository: 'r', pullRequestNumber: 2 }] };
    expect(normalizeCommitLogs(payload)).toEqual([
      { repository: 'r', pullRequestNumber: 2 },
    ]);
  });

  it('returns empty array for non-matching input', () => {
    expect(normalizeCommitLogs(null)).toEqual([]);
    expect(normalizeCommitLogs('string')).toEqual([]);
    expect(normalizeCommitLogs(42)).toEqual([]);
  });

  it('filters out non-commit-log items from array', () => {
    const arr = [{ repository: 'r', pullRequestNumber: 1 }, { foo: 'bar' }];
    expect(normalizeCommitLogs(arr)).toHaveLength(1);
  });
});
