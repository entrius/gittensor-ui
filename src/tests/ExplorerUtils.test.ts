import { describe, it, expect } from 'vitest';
import type { CommitLog } from '../api/models/Dashboard';
import type { IssueBounty } from '../api/models/Issues';
import {
  parseNumber,
  calculateDynamicOpenPrThreshold,
  normalizeMinerEvaluations,
  normalizeCommitLogs,
  sortMinerRepoStats,
  sortIssueRepoStats,
  buildRepoWeightsMap,
  aggregatePRsByRepository,
  aggregateIssueDiscoveryByRepository,
  hasActiveFilters,
  getDisplayCount,
  filterBySearch,
  type RepoStats,
  type IssueRepoStats,
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

describe('calculateDynamicOpenPrThreshold', () => {
  const baseMiner = {
    githubId: 'test',
    totalTokenScore: 600,
  } as any;

  it('returns default threshold with bonus when no scoring config', () => {
    // defaults: base=10, tokenScorePer=300, max=30; 600/300=2 bonus → 12
    expect(calculateDynamicOpenPrThreshold(baseMiner, undefined)).toBe(12);
  });

  it('calculates bonus from token score', () => {
    const scoring = {
      excessivePrPenaltyThreshold: 10,
      openPrThresholdTokenScore: 300,
      maxOpenPrThreshold: 30,
    } as any;
    // 600 / 300 = 2 bonus → 10 + 2 = 12
    expect(calculateDynamicOpenPrThreshold(baseMiner, scoring)).toBe(12);
  });

  it('caps at max threshold', () => {
    const highMiner = {
      ...baseMiner,
      totalTokenScore: 15000,
    } as any;
    const scoring = {
      excessivePrPenaltyThreshold: 10,
      openPrThresholdTokenScore: 300,
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

describe('sortMinerRepoStats', () => {
  const mockStats: RepoStats[] = [
    {
      repository: 'beta',
      prs: 5,
      score: 100,
      tokenScore: 80,
      weight: 0.5,
    },
    {
      repository: 'alpha',
      prs: 3,
      score: 50,
      tokenScore: 40,
      weight: 0.3,
    },
    {
      repository: 'gamma',
      prs: 2,
      score: 75,
      tokenScore: 60,
      weight: 0.2,
    },
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

describe('buildRepoWeightsMap', () => {
  it('returns empty map for undefined', () => {
    expect(buildRepoWeightsMap(undefined).size).toBe(0);
  });

  it('returns empty map for empty array', () => {
    expect(buildRepoWeightsMap([]).size).toBe(0);
  });

  it('builds map from valid repos', () => {
    const repos = [
      {
        fullName: 'org/repo1',
        owner: 'org',
        name: 'repo1',
        weight: '0.5',
      },
      {
        fullName: 'org/repo2',
        owner: 'org',
        name: 'repo2',
        weight: '0.3',
      },
    ];
    const map = buildRepoWeightsMap(repos);
    expect(map.get('org/repo1')).toBe(0.5);
    expect(map.get('org/repo2')).toBe(0.3);
  });

  it('skips entries with missing fullName', () => {
    const repos = [{ fullName: '', owner: '', name: '', weight: '0.5' }];
    const map = buildRepoWeightsMap(repos);
    expect(map.size).toBe(0);
  });
});

describe('aggregatePRsByRepository', () => {
  const weights = new Map([['org/repo1', 0.5]]);

  it('returns empty array for empty prs', () => {
    expect(aggregatePRsByRepository([], weights)).toEqual([]);
  });

  it('aggregates PRs into repo stats', () => {
    const prs = [
      {
        repository: 'org/repo1',
        score: '10',
        prState: 'MERGED',
        tokenScore: 50,
      },
      { repository: 'org/repo1', score: '5', prState: 'OPEN', tokenScore: 30 },
    ] as any[];
    const result = aggregatePRsByRepository(prs, weights);
    expect(result).toHaveLength(1);
    expect(result[0].prs).toBe(2);
    expect(result[0].score).toBe(15);
    expect(result[0].tokenScore).toBe(50); // only MERGED PR counted
    expect(result[0].weight).toBe(0.5);
  });

  it('creates separate entries for different repos', () => {
    const prs = [
      {
        repository: 'org/repo1',
        score: '10',
        prState: 'MERGED',
        tokenScore: 50,
      },
      {
        repository: 'org/repo2',
        score: '5',
        prState: 'MERGED',
        tokenScore: 30,
      },
    ] as any[];
    const result = aggregatePRsByRepository(prs, weights);
    expect(result).toHaveLength(2);
  });
});

describe('hasActiveFilters', () => {
  it('returns false when search is empty', () => {
    expect(hasActiveFilters('')).toBe(false);
    expect(hasActiveFilters('  ')).toBe(false);
  });

  it('returns true when search query is active', () => {
    expect(hasActiveFilters('repo')).toBe(true);
  });
});

describe('getDisplayCount', () => {
  it('returns filtered format when filtered', () => {
    expect(getDisplayCount(5, 10, true)).toBe('5 of 10');
  });

  it('returns simple count when not filtered', () => {
    expect(getDisplayCount(10, 10, false)).toBe('10');
  });
});

describe('filterBySearch', () => {
  const stats: RepoStats[] = [
    {
      repository: 'org/alpha',
      prs: 1,
      score: 10,
      tokenScore: 50,
      weight: 0.5,
    },
    {
      repository: 'org/beta',
      prs: 1,
      score: 10,
      tokenScore: 50,
      weight: 0.5,
    },
  ];

  it('returns all when search is empty', () => {
    expect(filterBySearch(stats, '')).toEqual(stats);
    expect(filterBySearch(stats, '  ')).toEqual(stats);
  });

  it('filters by repository name (case insensitive)', () => {
    const result = filterBySearch(stats, 'Alpha');
    expect(result).toHaveLength(1);
    expect(result[0].repository).toBe('org/alpha');
  });

  it('returns empty when no match', () => {
    expect(filterBySearch(stats, 'gamma')).toEqual([]);
  });
});

const basePr = (): CommitLog => ({
  pullRequestNumber: 5,
  hotkey: 'hk',
  pullRequestTitle: 'fix',
  additions: 1,
  deletions: 0,
  commitCount: 1,
  repository: 'org/repo',
  mergedAt: '2025-01-01T00:00:00Z',
  closedAt: null,
  prCreatedAt: '2024-12-01T00:00:00Z',
  prState: 'MERGED',
  author: 'user',
  score: '10',
  tokenScore: 12,
});

const baseIssue = (over: Partial<IssueBounty> = {}): IssueBounty => ({
  id: 1,
  githubUrl: 'https://github.com/org/repo/issues/1',
  repositoryFullName: 'org/repo',
  issueNumber: 1,
  bountyAmount: '1.5',
  targetBounty: '2',
  status: 'completed',
  solverHotkey: null,
  winningPrNumber: 5,
  registeredAtBlock: 0,
  createdAt: '',
  updatedAt: '',
  closedAt: null,
  completedAt: '2025-01-02T00:00:00Z',
  ...over,
});

describe('aggregateIssueDiscoveryByRepository', () => {
  const weights = new Map<string, number>([['org/repo', 0.2]]);

  it('returns empty when inputs are empty', () => {
    expect(aggregateIssueDiscoveryByRepository([], [], weights)).toEqual([]);
    expect(aggregateIssueDiscoveryByRepository([], [baseIssue()], weights)).toEqual(
      [],
    );
  });

  it('aggregates completed bounty matched to miner merged PR', () => {
    const result = aggregateIssueDiscoveryByRepository(
      [basePr()],
      [baseIssue()],
      weights,
    );
    expect(result).toHaveLength(1);
    expect(result[0].repository).toBe('org/repo');
    expect(result[0].solved).toBe(1);
    expect(result[0].validSolved).toBe(1);
    expect(result[0].issueTokenScore).toBe(12);
    expect(result[0].bountyEarned).toBeCloseTo(1.5);
    expect(result[0].weight).toBe(0.2);
  });

  it('does not count when winning PR number does not match', () => {
    const result = aggregateIssueDiscoveryByRepository(
      [basePr()],
      [baseIssue({ winningPrNumber: 99 })],
      weights,
    );
    expect(result).toEqual([]);
  });

  it('marks valid only when token score meets threshold', () => {
    const lowTok = { ...basePr(), pullRequestNumber: 7, tokenScore: 3 };
    const result = aggregateIssueDiscoveryByRepository(
      [lowTok],
      [baseIssue({ winningPrNumber: 7 })],
      weights,
    );
    expect(result[0].validSolved).toBe(0);
  });
});

describe('sortIssueRepoStats', () => {
  const rows: IssueRepoStats[] = [
    {
      repository: 'a/a',
      solved: 1,
      validSolved: 1,
      issueTokenScore: 10,
      bountyEarned: 1,
      weight: 0.1,
      latestActivityDate: null,
    },
    {
      repository: 'b/b',
      solved: 2,
      validSolved: 2,
      issueTokenScore: 30,
      bountyEarned: 2,
      weight: 0.2,
      latestActivityDate: null,
    },
  ];

  it('sorts by issueTokenScore desc', () => {
    const sorted = sortIssueRepoStats(rows, 'issueTokenScore', 'desc');
    expect(sorted[0].repository).toBe('b/b');
  });
});
