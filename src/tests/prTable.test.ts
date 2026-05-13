import { describe, expect, it } from 'vitest';
import type { CommitLog } from '../api';
import { formatPrLifecycleDate, getPrLifecycleDate } from '../utils';

const pr = (overrides: Partial<CommitLog>): CommitLog =>
  ({
    pullRequestNumber: 1,
    hotkey: 'hk',
    pullRequestTitle: 'Title',
    additions: 0,
    deletions: 0,
    commitCount: 1,
    repository: 'owner/repo',
    mergedAt: null,
    closedAt: null,
    prCreatedAt: '2026-05-01T12:00:00.000Z',
    prState: 'OPEN',
    author: 'alice',
    score: '0',
    ...overrides,
  }) as CommitLog;

describe('PR lifecycle dates', () => {
  it('prefers mergedAt for merged PRs', () => {
    const mergedAt = '2026-05-03T12:00:00.000Z';

    expect(
      getPrLifecycleDate(
        pr({
          mergedAt,
          closedAt: '2026-05-04T12:00:00.000Z',
          prState: 'MERGED',
        }),
      ),
    ).toBe(mergedAt);
  });

  it('uses closedAt for closed unmerged PRs', () => {
    const closedAt = '2026-05-02T12:00:00.000Z';

    expect(getPrLifecycleDate(pr({ closedAt, prState: 'CLOSED' }))).toBe(
      closedAt,
    );
  });

  it('uses prCreatedAt for open PRs', () => {
    const prCreatedAt = '2026-05-01T12:00:00.000Z';

    expect(getPrLifecycleDate(pr({ prCreatedAt, prState: 'OPEN' }))).toBe(
      prCreatedAt,
    );
  });

  it('falls back to a dash when the API omits the expected date', () => {
    expect(formatPrLifecycleDate(pr({ prCreatedAt: null }))).toBe('-');
  });
});
