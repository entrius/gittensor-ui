import { type CommitLog } from '../api';
import { isClosedUnmergedPr, isMergedPr, isOpenPr } from './prStatus';

/** Substring match against merged timestamp (ISO, locale date/time, year). */
export const mergedAtMatchesSearch = (
  mergedAt: string | null | undefined,
  qLower: string,
): boolean => {
  if (!mergedAt || !qLower) return false;
  if (String(mergedAt).toLowerCase().includes(qLower)) return true;
  const d = new Date(mergedAt);
  if (Number.isNaN(d.getTime())) return false;
  if (d.toLocaleDateString().toLowerCase().includes(qLower)) return true;
  if (d.toLocaleString().toLowerCase().includes(qLower)) return true;
  if (String(d.getFullYear()).includes(qLower)) return true;
  return false;
};

export type PrStatusFilter = 'all' | 'open' | 'merged' | 'closed';

interface FilterPrsOptions {
  author?: string | null;
  includeNumber?: boolean;
  searchQuery?: string;
  statusFilter?: PrStatusFilter;
}

export const filterPrs = <T extends CommitLog>(
  prs: T[],
  {
    author,
    includeNumber = false,
    searchQuery = '',
    statusFilter = 'all',
  }: FilterPrsOptions = {},
) => {
  let filtered = prs;

  if (author) {
    filtered = filtered.filter((pr) => pr.author === author);
  }

  if (statusFilter === 'open') filtered = filtered.filter(isOpenPr);
  else if (statusFilter === 'merged') filtered = filtered.filter(isMergedPr);
  else if (statusFilter === 'closed')
    filtered = filtered.filter(isClosedUnmergedPr);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return filtered;

  return filtered.filter(
    (pr) =>
      pr.pullRequestTitle?.toLowerCase().includes(normalizedQuery) ||
      pr.repository.toLowerCase().includes(normalizedQuery) ||
      (includeNumber &&
        (String(pr.pullRequestNumber).includes(normalizedQuery) ||
          `#${pr.pullRequestNumber}`.includes(normalizedQuery))) ||
      mergedAtMatchesSearch(pr.mergedAt, normalizedQuery),
  );
};

export const paginateItems = <T>(items: T[], page: number, pageSize: number) =>
  items.slice(page * pageSize, page * pageSize + pageSize);

/** Parsed `score` comparison from the PR search box, e.g. `score > 20`. */
export type ScorePredicate = {
  op: '>' | '>=' | '<' | '<=' | '=';
  value: number;
};

const SCORE_TOKEN_RE =
  /\bscore\s*((?:>=|<=|>|<|=))\s*([0-9]+(?:\.[0-9]+)?)/i;

export const parsePrSearchQuery = (
  raw: string,
): {
  textSearch: string;
  scorePredicate: ScorePredicate | null;
  /** Exact matched substring from `raw` (remove this when dropping the score chip). */
  scoreMatch: string | null;
} => {
  const trimmed = raw.trim();
  const m = SCORE_TOKEN_RE.exec(trimmed);
  if (!m) {
    return { textSearch: trimmed, scorePredicate: null, scoreMatch: null };
  }
  const op = m[1] as ScorePredicate['op'];
  const value = parseFloat(m[2] ?? '');
  if (Number.isNaN(value)) {
    return { textSearch: trimmed, scorePredicate: null, scoreMatch: null };
  }
  const scoreMatch = m[0];
  const textSearch =
    `${trimmed.slice(0, m.index)} ${trimmed.slice(m.index + m[0].length)}`
      .replace(/\s+/g, ' ')
      .trim();
  return {
    textSearch,
    scorePredicate: { op, value },
    scoreMatch,
  };
};

export const matchesScorePredicate = (
  scoreStr: string | undefined,
  pred: ScorePredicate,
): boolean => {
  const n = parseFloat(scoreStr || '0');
  if (Number.isNaN(n)) return false;
  switch (pred.op) {
    case '>':
      return n > pred.value;
    case '>=':
      return n >= pred.value;
    case '<':
      return n < pred.value;
    case '<=':
      return n <= pred.value;
    case '=':
      return n === pred.value;
    default:
      return false;
  }
};

export const formatScorePredicateLabel = (pred: ScorePredicate): string =>
  `score ${pred.op} ${pred.value}`;

/**
 * One search token (e.g. `se`, or `score > 20`, or `fix score > 10`) matched against a PR.
 * Text matches title, repo name, optionally PR number, and merged time string; score clause applies when parsed.
 */
export const matchesPrSearchTerm = (
  pr: CommitLog,
  rawTerm: string,
  includeNumber: boolean,
): boolean => {
  const trimmed = rawTerm.trim();
  if (!trimmed) return false;
  const { textSearch, scorePredicate } = parsePrSearchQuery(trimmed);
  const q = textSearch.trim().toLowerCase();
  const hasText = q.length > 0;
  const hasScore = scorePredicate !== null;

  if (!hasText && !hasScore) return false;

  if (
    hasScore &&
    scorePredicate &&
    !matchesScorePredicate(pr.score, scorePredicate)
  )
    return false;

  if (hasText) {
    return (
      Boolean(pr.pullRequestTitle?.toLowerCase().includes(q)) ||
      pr.repository.toLowerCase().includes(q) ||
      (includeNumber && String(pr.pullRequestNumber).includes(q)) ||
      mergedAtMatchesSearch(pr.mergedAt, q)
    );
  }

  return true;
};

/** Apply multiple tokens with AND semantics (every term must match). */
export const filterPrsBySearchTerms = <T extends CommitLog>(
  prs: T[],
  rawTerms: readonly string[],
  includeNumber: boolean,
): T[] =>
  rawTerms.reduce<T[]>((acc, raw) => {
    const t = raw.trim();
    if (!t) return acc;
    return acc.filter((pr) => matchesPrSearchTerm(pr, t, includeNumber));
  }, prs);
