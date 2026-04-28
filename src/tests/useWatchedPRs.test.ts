import { describe, it, expect } from 'vitest';
import {
  getWatchedSources,
  matchesWatchedSet,
  type WatchedPRSource,
} from '../hooks/useWatchedPRs';
import type { CommitLog } from '../api';

const pr = (overrides: Partial<CommitLog> = {}): CommitLog =>
  ({
    pullRequestNumber: 1,
    hotkey: 'hk-default',
    pullRequestTitle: 't',
    additions: 0,
    deletions: 0,
    commitCount: 1,
    repository: 'owner/repo',
    mergedAt: null,
    closedAt: null,
    prCreatedAt: '',
    prState: 'open',
    author: 'alice',
    githubId: 'gh-default',
    score: '0',
    ...overrides,
  }) as CommitLog;

describe('matchesWatchedSet', () => {
  const empty = {
    starred: new Set<string>(),
    repos: new Set<string>(),
    miners: new Set<string>(),
  };

  it('returns false when no source matches', () => {
    expect(
      matchesWatchedSet(
        pr({ repository: 'owner/repo', pullRequestNumber: 5 }),
        empty.starred,
        empty.repos,
        empty.miners,
      ),
    ).toBe(false);
  });

  it('matches an explicitly starred PR by composite key', () => {
    expect(
      matchesWatchedSet(
        pr({ repository: 'owner/repo', pullRequestNumber: 5 }),
        new Set(['owner/repo#5']),
        empty.repos,
        empty.miners,
      ),
    ).toBe(true);
  });

  it('matches a watched repo case-insensitively', () => {
    expect(
      matchesWatchedSet(
        pr({ repository: 'Owner/Repo' }),
        empty.starred,
        new Set(['owner/repo']),
        empty.miners,
      ),
    ).toBe(true);
  });

  it('matches a PR whose githubId belongs to a watched miner', () => {
    expect(
      matchesWatchedSet(
        pr({ githubId: '12345' }),
        empty.starred,
        empty.repos,
        new Set(['12345']),
      ),
    ).toBe(true);
  });

  it('does not match when pr.githubId is undefined even if the set is non-empty', () => {
    expect(
      matchesWatchedSet(
        pr({ githubId: undefined }),
        empty.starred,
        empty.repos,
        new Set(['12345']),
      ),
    ).toBe(false);
  });

  it('returns true when a PR matches multiple sources', () => {
    const p = pr({
      repository: 'owner/repo',
      pullRequestNumber: 5,
      githubId: '12345',
    });
    expect(
      matchesWatchedSet(
        p,
        new Set(['owner/repo#5']),
        new Set(['owner/repo']),
        new Set(['12345']),
      ),
    ).toBe(true);
  });

  it('does not match a watched repo when casing differs and the watched set is not normalized', () => {
    expect(
      matchesWatchedSet(
        pr({ repository: 'Owner/Repo' }),
        empty.starred,
        new Set(['Owner/Repo']),
        empty.miners,
      ),
    ).toBe(false);
  });

  it('does not match a miner whose id is not in the watched set', () => {
    expect(
      matchesWatchedSet(
        pr({ githubId: '99999' }),
        empty.starred,
        empty.repos,
        new Set(['12345']),
      ),
    ).toBe(false);
  });

  it('does not false-positive when a watched repo is a substring of pr.repository', () => {
    expect(
      matchesWatchedSet(
        pr({ repository: 'owner/repo' }),
        empty.starred,
        new Set(['own']),
        empty.miners,
      ),
    ).toBe(false);
  });

  it('does not false-positive when a watched miner id is a substring of pr.githubId', () => {
    expect(
      matchesWatchedSet(
        pr({ githubId: '12345' }),
        empty.starred,
        empty.repos,
        new Set(['12']),
      ),
    ).toBe(false);
  });

  it('classifies a realistic mixed dataset by the correct source', () => {
    const starred = new Set(['acme/web#1']);
    const repos = new Set(['acme/db']);
    const miners = new Set(['gh-alice', 'gh-bob']);

    expect(
      matchesWatchedSet(
        pr({
          repository: 'acme/web',
          pullRequestNumber: 1,
          githubId: 'gh-x',
        }),
        starred,
        repos,
        miners,
      ),
    ).toBe(true);

    expect(
      matchesWatchedSet(
        pr({
          repository: 'acme/db',
          pullRequestNumber: 99,
          githubId: 'gh-x',
        }),
        starred,
        repos,
        miners,
      ),
    ).toBe(true);

    expect(
      matchesWatchedSet(
        pr({
          repository: 'other/code',
          pullRequestNumber: 5,
          githubId: 'gh-alice',
        }),
        starred,
        repos,
        miners,
      ),
    ).toBe(true);

    expect(
      matchesWatchedSet(
        pr({
          repository: 'other/code',
          pullRequestNumber: 6,
          githubId: 'gh-x',
        }),
        starred,
        repos,
        miners,
      ),
    ).toBe(false);
  });
});

describe('getWatchedSources', () => {
  const empty = {
    starred: new Set<string>(),
    repos: new Set<string>(),
    miners: new Set<string>(),
  };

  it('returns an empty array when no source matches', () => {
    expect(
      getWatchedSources(
        pr({ repository: 'owner/repo', pullRequestNumber: 5 }),
        empty.starred,
        empty.repos,
        empty.miners,
      ),
    ).toEqual([]);
  });

  it('returns ["starred"] when only the starred set matches', () => {
    expect(
      getWatchedSources(
        pr({ repository: 'owner/repo', pullRequestNumber: 5 }),
        new Set(['owner/repo#5']),
        empty.repos,
        empty.miners,
      ),
    ).toEqual<WatchedPRSource[]>(['starred']);
  });

  it('returns ["miner"] when only the miner set matches', () => {
    expect(
      getWatchedSources(
        pr({ githubId: 'gh-alice' }),
        empty.starred,
        empty.repos,
        new Set(['gh-alice']),
      ),
    ).toEqual<WatchedPRSource[]>(['miner']);
  });

  it('returns ["repo"] when only the repo set matches (case-insensitive)', () => {
    expect(
      getWatchedSources(
        pr({ repository: 'Owner/Repo' }),
        empty.starred,
        new Set(['owner/repo']),
        empty.miners,
      ),
    ).toEqual<WatchedPRSource[]>(['repo']);
  });

  it('returns sources in stable order [starred, miner, repo] when multiple match', () => {
    expect(
      getWatchedSources(
        pr({
          repository: 'owner/repo',
          pullRequestNumber: 5,
          githubId: 'gh-alice',
        }),
        new Set(['owner/repo#5']),
        new Set(['owner/repo']),
        new Set(['gh-alice']),
      ),
    ).toEqual<WatchedPRSource[]>(['starred', 'miner', 'repo']);
  });

  it('returns ["miner", "repo"] when starred is absent but miner and repo match', () => {
    expect(
      getWatchedSources(
        pr({ repository: 'owner/repo', githubId: 'gh-alice' }),
        empty.starred,
        new Set(['owner/repo']),
        new Set(['gh-alice']),
      ),
    ).toEqual<WatchedPRSource[]>(['miner', 'repo']);
  });

  it('returns no "miner" entry when pr.githubId is undefined even if the miner set is populated', () => {
    expect(
      getWatchedSources(
        pr({ githubId: undefined }),
        empty.starred,
        empty.repos,
        new Set(['gh-alice']),
      ),
    ).toEqual<WatchedPRSource[]>([]);
  });
});
