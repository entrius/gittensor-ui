/**
 * Pure helpers for "This is me" highlighting (issue #526).
 * Matching is case-insensitive. GitHub logins ignore leading @.
 */

export type SelfIdentityPrefs = {
  githubLogin: string;
  hotkey: string;
};

export const normalizeGithubLogin = (value: string | null | undefined): string =>
  (value ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();

export const normalizeHotkey = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export const githubLoginMatches = (
  prefs: SelfIdentityPrefs,
  candidate: string | null | undefined,
): boolean => {
  const self = normalizeGithubLogin(prefs.githubLogin);
  if (!self) return false;
  const other = normalizeGithubLogin(candidate);
  return !!other && self === other;
};

export const hotkeyMatches = (
  prefs: SelfIdentityPrefs,
  candidate: string | null | undefined,
): boolean => {
  const self = normalizeHotkey(prefs.hotkey);
  if (!self) return false;
  const other = normalizeHotkey(candidate);
  return !!other && self === other;
};

export type MinerSelfMatchInput = {
  githubId: string;
  author?: string;
  hotkey: string;
};

/**
 * Leaderboard miner cards: GitHub handle against `author` or non-numeric
 * `githubId`, plus optional hotkey match against the miner's subnet hotkey.
 */
export const minerMatchesSelf = (
  miner: MinerSelfMatchInput,
  prefs: SelfIdentityPrefs,
): boolean => {
  if (hotkeyMatches(prefs, miner.hotkey)) return true;
  if (githubLoginMatches(prefs, miner.author)) return true;
  if (miner.githubId && !/^\d+$/.test(miner.githubId)) {
    if (githubLoginMatches(prefs, miner.githubId)) return true;
  }
  return false;
};

export const prAuthorMatchesSelf = (
  prefs: SelfIdentityPrefs,
  author: string | null | undefined,
  prHotkey?: string | null,
): boolean =>
  githubLoginMatches(prefs, author) || hotkeyMatches(prefs, prHotkey);

export const bountySolverMatchesSelf = (
  prefs: SelfIdentityPrefs,
  solverHotkey: string | null | undefined,
): boolean => hotkeyMatches(prefs, solverHotkey);

export const contributorRowMatchesSelf = (
  prefs: SelfIdentityPrefs,
  contributor: { author: string; githubId: string },
): boolean => {
  if (githubLoginMatches(prefs, contributor.author)) return true;
  if (
    contributor.githubId &&
    !/^\d+$/.test(contributor.githubId) &&
    githubLoginMatches(prefs, contributor.githubId)
  ) {
    return true;
  }
  return false;
};

export const submissionMatchesSelf = (
  prefs: SelfIdentityPrefs,
  submission: { authorLogin: string; hotkey: string | null },
): boolean =>
  githubLoginMatches(prefs, submission.authorLogin) ||
  hotkeyMatches(prefs, submission.hotkey);
