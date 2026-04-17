import { describe, expect, it } from 'vitest';
import {
  bountySolverMatchesSelf,
  githubLoginMatches,
  hotkeyMatches,
  minerMatchesSelf,
  normalizeGithubLogin,
  prAuthorMatchesSelf,
  submissionMatchesSelf,
} from '../utils/selfIdentityMatch';

describe('normalizeGithubLogin', () => {
  it('trims and lowercases and strips @', () => {
    expect(normalizeGithubLogin('  @OctoCat ')).toBe('octocat');
  });
});

describe('githubLoginMatches', () => {
  const prefs = { githubLogin: 'alice', hotkey: '' };
  it('matches case-insensitively', () => {
    expect(githubLoginMatches(prefs, 'Alice')).toBe(true);
  });
  it('returns false when prefs empty', () => {
    expect(githubLoginMatches({ githubLogin: '', hotkey: '' }, 'bob')).toBe(
      false,
    );
  });
});

describe('hotkeyMatches', () => {
  const prefs = { githubLogin: '', hotkey: '5ABCdef' };
  it('matches case-insensitively', () => {
    expect(hotkeyMatches(prefs, '5abcdef')).toBe(true);
  });
});

describe('minerMatchesSelf', () => {
  it('matches author login', () => {
    expect(
      minerMatchesSelf(
        { githubId: '99', author: 'carol', hotkey: 'hk1' },
        { githubLogin: 'Carol', hotkey: '' },
      ),
    ).toBe(true);
  });
  it('matches non-numeric githubId as login', () => {
    expect(
      minerMatchesSelf(
        { githubId: 'dave', author: '12345', hotkey: '' },
        { githubLogin: 'Dave', hotkey: '' },
      ),
    ).toBe(true);
  });
  it('matches hotkey', () => {
    expect(
      minerMatchesSelf(
        { githubId: '1', author: 'x', hotkey: 'SAME' },
        { githubLogin: '', hotkey: 'same' },
      ),
    ).toBe(true);
  });
  it('does not treat numeric githubId as login', () => {
    expect(
      minerMatchesSelf(
        { githubId: '12345', author: '999', hotkey: '' },
        { githubLogin: '12345', hotkey: '' },
      ),
    ).toBe(false);
  });
});

describe('prAuthorMatchesSelf', () => {
  it('matches author or hotkey', () => {
    const prefs = { githubLogin: 'bob', hotkey: 'hk99' };
    expect(prAuthorMatchesSelf(prefs, 'Bob', null)).toBe(true);
    expect(prAuthorMatchesSelf(prefs, 'other', 'HK99')).toBe(true);
    expect(prAuthorMatchesSelf(prefs, 'other', null)).toBe(false);
  });
});

describe('bountySolverMatchesSelf', () => {
  it('uses hotkey only', () => {
    expect(
      bountySolverMatchesSelf(
        { githubLogin: 'a', hotkey: 'solver' },
        'Solver',
      ),
    ).toBe(true);
  });
});

describe('submissionMatchesSelf', () => {
  it('matches login or submission hotkey', () => {
    expect(
      submissionMatchesSelf(
        { githubLogin: 'pat', hotkey: '' },
        { authorLogin: 'Pat', hotkey: null },
      ),
    ).toBe(true);
    expect(
      submissionMatchesSelf(
        { githubLogin: '', hotkey: 'hk' },
        { authorLogin: 'x', hotkey: 'HK' },
      ),
    ).toBe(true);
  });
});
