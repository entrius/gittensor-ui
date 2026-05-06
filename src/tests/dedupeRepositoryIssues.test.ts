import { describe, it, expect } from 'vitest';
import { dedupeRepositoryIssues } from '../utils/dedupeRepositoryIssues';
import type { RepositoryIssue } from '../api';

const makeIssue = (
  number: number,
  overrides: Partial<RepositoryIssue> = {},
): RepositoryIssue => ({
  number,
  repositoryFullName: 'opentensor/btcli',
  prNumber: null,
  title: `Issue ${number}`,
  createdAt: '2026-01-01T00:00:00Z',
  closedAt: null,
  ...overrides,
});

describe('dedupeRepositoryIssues', () => {
  it('returns an empty array for nullish or empty input', () => {
    expect(dedupeRepositoryIssues(undefined)).toEqual([]);
    expect(dedupeRepositoryIssues(null)).toEqual([]);
    expect(dedupeRepositoryIssues([])).toEqual([]);
  });

  it('passes through a list with no duplicates unchanged in order', () => {
    const input = [makeIssue(1), makeIssue(2), makeIssue(3)];
    const result = dedupeRepositoryIssues(input);
    expect(result).toHaveLength(3);
    expect(result.map((i) => i.number)).toEqual([1, 2, 3]);
  });

  it('keeps the first occurrence of each duplicated issue and preserves order', () => {
    const first = makeIssue(42, { title: 'first' });
    const second = makeIssue(42, { title: 'duplicate' });
    const third = makeIssue(7, { title: 'distinct' });
    const result = dedupeRepositoryIssues([first, second, third]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(first);
    expect(result[0].title).toBe('first');
    expect(result[1].number).toBe(7);
  });

  it('treats issues with the same number but different repos as distinct', () => {
    const a = makeIssue(1, { repositoryFullName: 'foo/bar' });
    const b = makeIssue(1, { repositoryFullName: 'foo/baz' });
    const result = dedupeRepositoryIssues([a, b]);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.repositoryFullName)).toEqual([
      'foo/bar',
      'foo/baz',
    ]);
  });

  it('collapses heavy duplication so counts derived downstream are accurate', () => {
    const issues: RepositoryIssue[] = [
      makeIssue(1, { closedAt: null }),
      makeIssue(1, { closedAt: null }),
      makeIssue(1, { closedAt: null }),
      makeIssue(2, { closedAt: '2026-02-01T00:00:00Z' }),
      makeIssue(2, { closedAt: '2026-02-01T00:00:00Z' }),
    ];
    const result = dedupeRepositoryIssues(issues);
    expect(result).toHaveLength(2);
    const open = result.filter((i) => !i.closedAt).length;
    const closed = result.filter((i) => i.closedAt).length;
    expect(open).toBe(1);
    expect(closed).toBe(1);
  });
});
