import { describe, it, expect } from 'vitest';
import {
  parseNumber,
  calculateDynamicOpenPrThreshold,
  normalizeMinerEvaluations,
  normalizeCommitLogs,
  sortMinerRepoStats,
  buildRepoWeightsMap,
  aggregatePRsByRepository,
  hasActiveFilters,
  getDisplayCount,
  filterBySearch,
  isIssueDiscoveryContributionPr,
  isIssueDiscoveryMultiplierPr,
  aggregateIssueDiscoveryRepos,
  buildMergedIssueDiscoveryByRepo,
  buildRepoDiscoveryRollupFromMiners,
  buildIssueBountyRollupByRepo,
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

  it('lower-cases fullName keys for consistent PR lookup', () => {
    const repos = [
      { fullName: 'Org/RepoA', owner: '', name: '', weight: '0.7' },
    ] as any[];
    const map = buildRepoWeightsMap(repos);
    expect(map.get('org/repoa')).toBe(0.7);
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

  it('matches weights when PR repository casing differs', () => {
    const w = new Map([['org/repo1', 0.5]]);
    const prs = [
      {
        repository: 'ORG/REPO1',
        score: '10',
        prState: 'MERGED',
        mergedAt: '2024-01-01',
        tokenScore: 50,
      },
    ] as any[];
    const result = aggregatePRsByRepository(prs, w);
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(0.5);
    expect(result[0].repository).toBe('ORG/REPO1');
  });
});

describe('isIssueDiscoveryContributionPr', () => {
  it('is true when issueMultiplier parses positive', () => {
    expect(
      isIssueDiscoveryContributionPr({ issueMultiplier: '1.2' } as any),
    ).toBe(true);
  });

  it('is true when label only (miner payloads)', () => {
    expect(
      isIssueDiscoveryContributionPr({
        issueMultiplier: '0',
        label: 'bounty',
      } as any),
    ).toBe(true);
  });
});

describe('isIssueDiscoveryMultiplierPr', () => {
  it('requires multiplier fields, not label alone', () => {
    expect(
      isIssueDiscoveryMultiplierPr({ issueMultiplier: '1.1' } as any),
    ).toBe(true);
    expect(
      isIssueDiscoveryMultiplierPr({
        issueMultiplier: '0',
        label: 'bounty',
      } as any),
    ).toBe(false);
  });
});

describe('aggregateIssueDiscoveryRepos', () => {
  const w = new Map([['org/a', 0.2]]);

  it('aggregates merged discovery PRs only', () => {
    const prs = [
      {
        repository: 'org/a',
        score: '2',
        issueMultiplier: '1.2',
        prState: 'MERGED',
        mergedAt: '2024-01-01',
        tokenScore: 10,
      },
    ] as any[];
    const r = aggregateIssueDiscoveryRepos(prs, w);
    expect(r).toHaveLength(1);
    expect(r[0].prs).toBe(1);
  });

  it('excludes open issue-discovery PRs', () => {
    const prs = [
      {
        repository: 'org/a',
        score: '99',
        issueMultiplier: '1',
        prState: 'OPEN',
        mergedAt: null,
      },
      {
        repository: 'org/a',
        score: '2',
        issueMultiplier: '1',
        prState: 'MERGED',
        mergedAt: '2024-01-01',
      },
    ] as any[];
    const r = aggregateIssueDiscoveryRepos(prs, w);
    expect(r).toHaveLength(1);
    expect(r[0].prs).toBe(1);
    expect(r[0].score).toBe(2);
  });
});

describe('buildMergedIssueDiscoveryByRepo', () => {
  it('only counts merged PRs with discovery multipliers', () => {
    const prs = [
      {
        repository: 'org/a',
        mergedAt: null,
        prState: 'OPEN',
        issueMultiplier: '1',
      },
      {
        repository: 'org/a',
        mergedAt: '2024-01-01',
        prState: 'MERGED',
        issueMultiplier: '1',
        score: '3',
        tokenScore: 0,
      },
    ] as any[];
    const m = buildMergedIssueDiscoveryByRepo(prs);
    const row = m.get('org/a');
    expect(row?.discoveryIssues).toBe(1);
    expect(row?.discoveryScore).toBe(3);
  });
});

describe('buildRepoDiscoveryRollupFromMiners', () => {
  const discoveryPr = (overrides: Record<string, unknown>) =>
    ({
      repository: 'org/repo',
      mergedAt: '2024-01-01',
      prState: 'MERGED',
      issueMultiplier: '1',
      score: '1',
      tokenScore: 0,
      ...overrides,
    }) as any;

  it('pro-rates miner discovery score and completed issues', () => {
    const miners = [
      {
        githubId: '99',
        issueDiscoveryScore: 200,
        totalValidSolvedIssues: 12,
        totalSolvedIssues: 0,
      },
    ] as any[];

    const prs = [
      discoveryPr({ repository: 'org/a', githubId: '99', author: 'alice' }),
      discoveryPr({ repository: 'org/b', githubId: '99', author: 'alice' }),
      discoveryPr({ repository: 'org/b', githubId: '99', author: 'alice' }),
    ];

    const m = buildRepoDiscoveryRollupFromMiners(prs, miners);
    const a = m.get('org/a');
    const b = m.get('org/b');
    expect(a!.discoveryScore).toBeCloseTo(200 / 3, 5);
    expect(a!.discoveryIssues).toBe(Math.round(12 / 3));
    expect(b!.discoveryScore).toBeCloseTo((200 * 2) / 3, 5);
    expect(b!.discoveryIssues).toBe(Math.round((12 * 2) / 3));
    expect(a!.discoveryContributors.has('alice')).toBe(true);
  });

  it('does not count contributors with zero miner discovery stats', () => {
    const miners = [
      {
        githubId: '99',
        issueDiscoveryScore: 0,
        totalValidSolvedIssues: 0,
        totalSolvedIssues: 0,
      },
    ] as any[];
    const prs = [
      discoveryPr({
        repository: 'org/z',
        githubId: '99',
        author: 'ghost',
      }),
    ];
    const m = buildRepoDiscoveryRollupFromMiners(prs, miners);
    const z = m.get('org/z');
    expect(z!.discoveryContributors.size).toBe(0);
  });
});

describe('buildIssueBountyRollupByRepo', () => {
  it('aggregates bounty issues by repository', () => {
    const issues = [
      { repositoryFullName: 'org/A', status: 'active' },
      { repositoryFullName: 'org/A', status: 'completed' },
    ] as any[];
    const m = buildIssueBountyRollupByRepo(issues);
    const a = m.get('org/a');
    expect(a!.bountyIssuesTotal).toBe(2);
    expect(a!.bountyIssuesActive).toBe(1);
    expect(a!.bountyIssuesCompleted).toBe(1);
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
