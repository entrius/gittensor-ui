import type { IssueBounty } from '../api/models/Issues';

const pickTrimmedString = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t || undefined;
};

const pickUserLogin = (raw: Record<string, unknown>): string | undefined => {
  const user = raw.user;
  if (user && typeof user === 'object' && user !== null) {
    return pickTrimmedString((user as Record<string, unknown>).login);
  }
  return undefined;
};

/**
 * Coerce `/issues` list payloads into `IssueBounty` (camelCase + author).
 * Mirrors may send `author_login` or GitHub-shaped `user.login` instead of `authorLogin`.
 */
export const normalizeIssueBountyFromApi = (raw: unknown): IssueBounty => {
  if (!raw || typeof raw !== 'object') {
    return raw as IssueBounty;
  }
  const r = raw as Record<string, unknown>;
  const base = { ...r } as unknown as IssueBounty;

  const author =
    pickTrimmedString(base.authorLogin) ??
    pickTrimmedString(r.author_login) ??
    pickUserLogin(r);

  if (author) {
    return { ...base, authorLogin: author };
  }
  return base;
};

export const normalizeIssueBountyList = (raw: unknown): IssueBounty[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeIssueBountyFromApi(item));
};
