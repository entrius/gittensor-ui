import { describe, it, expect } from 'vitest';
import { selectMinerIssueScanRepos } from '../hooks/useMinerRepositoriesOpenIssues';
import type { CommitLog } from '../api';

const pr = (overrides: Partial<CommitLog> = {}): CommitLog =>
  ({
    pullRequestNumber: 1,
    hotkey: 'hk',
    pullRequestTitle: 't',
    additions: 0,
    deletions: 0,
    commitCount: 1,
    repository: 'owner/repo',
    mergedAt: null,
    closedAt: null,
    prCreatedAt: '2024-01-01',
    prState: 'open',
    author: 'alice',
    githubId: 'gh',
    score: '0',
    ...overrides,
  }) as CommitLog;

describe('selectMinerIssueScanRepos', () => {
  it('returns empty for missing or empty PR list', () => {
    expect(selectMinerIssueScanRepos(undefined)).toEqual([]);
    expect(selectMinerIssueScanRepos([])).toEqual([]);
  });

  it('orders by most recent PR timestamp descending', () => {
    const prs = [
      pr({ repository: 'a/old', mergedAt: '2024-01-01' }),
      pr({ repository: 'a/recent', mergedAt: '2024-06-01' }),
      pr({ repository: 'a/middle', mergedAt: '2024-03-01' }),
    ];
    expect(selectMinerIssueScanRepos(prs)).toEqual([
      'a/recent',
      'a/middle',
      'a/old',
    ]);
  });

  it('uses prCreatedAt when mergedAt is null', () => {
    const prs = [
      pr({
        repository: 'a/created',
        mergedAt: null,
        prCreatedAt: '2024-05-01',
      }),
      pr({
        repository: 'a/merged',
        mergedAt: '2024-03-01',
        prCreatedAt: '2024-01-01',
      }),
    ];
    expect(selectMinerIssueScanRepos(prs)).toEqual(['a/created', 'a/merged']);
  });

  it('drops PRs whose repository field is missing, blank, or whitespace', () => {
    // Without the guard, blank repos produce an empty-string entry that the
    // caller dispatches as `GET /repos//issues` — 404 every fetch and pollutes
    // the react-query cache with a useless key.
    const prs = [
      pr({ repository: '', mergedAt: '2024-06-01' }),
      pr({ repository: '   ', mergedAt: '2024-05-01' }),
      pr({
        repository: undefined as unknown as string,
        mergedAt: '2024-04-01',
      }),
      pr({ repository: 'a/valid', mergedAt: '2024-01-01' }),
    ];
    expect(selectMinerIssueScanRepos(prs)).toEqual(['a/valid']);
  });

  it('trims surrounding whitespace from the repository name', () => {
    // Repos arriving with leading/trailing whitespace must not bypass the dedup
    // map by being treated as distinct keys from their trimmed form.
    const prs = [
      pr({ repository: '  a/repo  ', mergedAt: '2024-06-01' }),
      pr({ repository: 'a/repo', mergedAt: '2024-05-01' }),
    ];
    expect(selectMinerIssueScanRepos(prs)).toEqual(['a/repo']);
  });

  it('caps result length at the parallel-fetch limit', () => {
    const prs = Array.from({ length: 80 }, (_, i) =>
      pr({
        repository: `org/repo-${String(i).padStart(3, '0')}`,
        mergedAt: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
      }),
    );
    const result = selectMinerIssueScanRepos(prs);
    expect(result.length).toBe(50);
  });
});
