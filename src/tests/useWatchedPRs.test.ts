import { describe, it, expect } from 'vitest';
import {
  resolveWatchedMinerHotkeys,
  matchesWatchedSet,
} from '../hooks/useWatchedPRs';
import { type CommitLog } from '../api';

function makePr(overrides: Partial<CommitLog> = {}): CommitLog {
  return {
    pullRequestNumber: 1,
    hotkey: 'hk_default',
    pullRequestTitle: 'PR title',
    additions: 0,
    deletions: 0,
    commitCount: 1,
    repository: 'owner/repo',
    mergedAt: null,
    closedAt: null,
    prCreatedAt: '2026-01-01T00:00:00Z',
    prState: 'open',
    author: 'someone',
    score: '0',
    ...overrides,
  };
}

describe('resolveWatchedMinerHotkeys', () => {
  it('returns an empty set when no miners are watched', () => {
    const result = resolveWatchedMinerHotkeys(
      [{ githubId: '1', hotkey: 'hk_a' }],
      [],
    );
    expect(result.size).toBe(0);
  });

  it('returns an empty set when the miners cache is undefined', () => {
    const result = resolveWatchedMinerHotkeys(undefined, ['1']);
    expect(result.size).toBe(0);
  });

  it('maps watched githubIds to their hotkeys', () => {
    const miners = [
      { githubId: '1', hotkey: 'hk_a' },
      { githubId: '2', hotkey: 'hk_b' },
      { githubId: '3', hotkey: 'hk_c' },
    ];
    const result = resolveWatchedMinerHotkeys(miners, ['1', '3']);
    expect(Array.from(result).sort()).toEqual(['hk_a', 'hk_c']);
  });

  it('skips miners that lack a hotkey', () => {
    const miners = [
      { githubId: '1', hotkey: undefined },
      { githubId: '2', hotkey: 'hk_b' },
    ];
    const result = resolveWatchedMinerHotkeys(miners, ['1', '2']);
    expect(Array.from(result)).toEqual(['hk_b']);
  });
});

describe('matchesWatchedSet', () => {
  const empty = new Set<string>();

  it('matches when the PR key is starred', () => {
    const pr = makePr({ repository: 'owner/repo', pullRequestNumber: 42 });
    const starred = new Set(['owner/repo#42']);
    expect(matchesWatchedSet(pr, starred, empty, empty)).toBe(true);
  });

  it('matches when the repository is watched, case-insensitive', () => {
    const pr = makePr({ repository: 'Owner/Repo' });
    const repos = new Set(['owner/repo']);
    expect(matchesWatchedSet(pr, empty, repos, empty)).toBe(true);
  });

  it('matches when the miner hotkey is watched', () => {
    const pr = makePr({ hotkey: 'hk_xyz' });
    const hotkeys = new Set(['hk_xyz']);
    expect(matchesWatchedSet(pr, empty, empty, hotkeys)).toBe(true);
  });

  it('returns false when nothing matches', () => {
    const pr = makePr();
    expect(matchesWatchedSet(pr, empty, empty, empty)).toBe(false);
  });
});
