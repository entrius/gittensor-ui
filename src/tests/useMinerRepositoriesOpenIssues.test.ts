import { describe, expect, it } from 'vitest';
import type { CommitLog } from '../api/models/Dashboard';
import {
  selectMinerIssueScanRepoSummary,
  selectMinerIssueScanRepos,
} from '../hooks/useMinerRepositoriesOpenIssues';

const pr = (repository: string, index: number): CommitLog =>
  ({
    repository,
    mergedAt: `2026-01-${String((index % 28) + 1).padStart(2, '0')}T00:00:00Z`,
    prCreatedAt: '',
  }) as CommitLog;

describe('selectMinerIssueScanRepoSummary', () => {
  it('does not treat more than 50 PRs in fewer repositories as over the repo limit', () => {
    const prs = Array.from({ length: 60 }, (_, index) =>
      pr(index % 2 === 0 ? 'owner/api' : 'owner/web', index),
    );

    const summary = selectMinerIssueScanRepoSummary(prs);

    expect(summary.totalRepos).toBe(2);
    expect(summary.repos).toHaveLength(2);
    expect(summary.totalRepos).toBeLessThanOrEqual(50);
  });

  it('reports when more than 50 unique repositories are eligible to scan', () => {
    const prs = Array.from({ length: 55 }, (_, index) =>
      pr(`owner/repo-${index}`, index),
    );

    const summary = selectMinerIssueScanRepoSummary(prs);

    expect(summary.totalRepos).toBe(55);
    expect(summary.repos).toHaveLength(50);
    expect(summary.totalRepos).toBeGreaterThan(50);
  });
});

describe('selectMinerIssueScanRepos', () => {
  it('preserves the capped repository list API', () => {
    const prs = Array.from({ length: 55 }, (_, index) =>
      pr(`owner/repo-${index}`, index),
    );

    expect(selectMinerIssueScanRepos(prs)).toHaveLength(50);
  });
});
