/**
 * Builders for the dashboard "Featured Discoverers" section.
 *
 * Issue-discovery rewards in the gittensor subnet apply only inside a
 * curated set of mirror-enabled repositories (currently 4: `entrius/allways`,
 * `entrius/allways-ui`, `entrius/gittensor`, `entrius/gittensor-ui`). The
 * "discoverer" is the miner who FILED the issue — they earn when another
 * miner later solves it with a merged PR.
 *
 * The section surfaces exactly three rows, each answering a different
 * question:
 *   1. All-time: who has the highest cumulative `issueDiscoveryScore`
 *      across every registered miner? Matches the Discoveries page
 *      leaderboard (e.g. `#1 @bitloi score=50.10`).
 *   2. Most active discoverer (24h → 3d → 7d ladder): who has filed the
 *      most issues in the current rolling window? The window widens only
 *      when the narrower one yields no eligible filer.
 *   3. Highest-earning discoverer (24h → 3d → 7d ladder): among miners
 *      who filed any issue in the current window, who has the highest
 *      all-time `issueDiscoveryScore`? Requires a non-zero score in the
 *      chosen window; otherwise widens to the next rung.
 *
 * Rows 2 and 3 depend on per-issue authorship which no backend endpoint
 * exposes reliably today (see TODO notes in `useRecentMirrorIssues`), so
 * issue authorship comes from a GitHub Search fallback.
 */
import { type CommitLog, type MinerEvaluation } from '../../api';
import { parseNumber } from '../../utils';
import {
  DASHBOARD_HOUR_MS,
  isWithinWindow,
  toTimestamp,
  type WindowBounds,
} from './dashboardTime';

const ACTIVE_WINDOW_HOURS = 24;
const INTERMEDIATE_WINDOW_HOURS = 3 * 24;
const FALLBACK_WINDOW_HOURS = 7 * 24;

/**
 * Windows that rows 2 and 3 progressively widen through when the active
 * window yields no candidate. Order matters: narrow first, widen only as
 * needed.
 */
const DISCOVERER_WINDOW_LADDER: readonly number[] = [
  ACTIVE_WINDOW_HOURS,
  INTERMEDIATE_WINDOW_HOURS,
  FALLBACK_WINDOW_HOURS,
];

export interface DashboardDiscoveryKpi {
  label: string;
  value: string;
  delta?: string;
  tone?: 'positive' | 'neutral' | 'warning';
}

export interface DashboardFeaturedDiscovererAuthor {
  githubId?: string;
  username: string;
  displayName: string;
  usdPerDay?: number;
  credibility?: number;
  issueTokenScore?: number;
  issueDiscoveryScore?: number;
  totalValidSolvedIssues?: number;
}

export type FeaturedDiscovererRole =
  | 'all-time-top'
  | 'most-active'
  | 'highest-earning-filer';

export interface DashboardFeaturedDiscoverer {
  id: string;
  role: FeaturedDiscovererRole;
  roleLabel: string;
  windowLabel: string;
  author: DashboardFeaturedDiscovererAuthor;
  primary: { label: string; value: string };
  secondary: { label: string; value: string };
  repos: string[];
  href: string;
  tone: 'success' | 'neutral' | 'warning';
}

export interface DashboardDiscoveryPulse {
  windowLabel: string;
  kpis: DashboardDiscoveryKpi[];
  discoverers: DashboardFeaturedDiscoverer[];
}

/**
 * Shape of an issue as returned by `useRecentMirrorIssues`.
 */
export interface RecentMirrorIssue {
  repositoryFullName: string;
  number: number;
  title: string;
  htmlUrl: string;
  state: 'open' | 'closed';
  createdAt: string;
  closedAt?: string | null;
  authorGithubId?: string | null;
  authorLogin?: string | null;
}

export const getRollingWindowBounds = (
  now = new Date(),
  windowHours = ACTIVE_WINDOW_HOURS,
): WindowBounds => {
  const endMs = now.getTime();
  return {
    startMs: endMs - windowHours * DASHBOARD_HOUR_MS,
    endMs,
  };
};

export const getPreviousRollingWindowBounds = (
  now = new Date(),
  windowHours = ACTIVE_WINDOW_HOURS,
): WindowBounds => {
  const current = getRollingWindowBounds(now, windowHours);
  const windowMs = windowHours * DASHBOARD_HOUR_MS;
  return {
    startMs: current.startMs - windowMs,
    endMs: current.startMs,
  };
};

interface MinerIndexes {
  byGithubId: Map<string, MinerEvaluation>;
  byUsername: Map<string, MinerEvaluation>;
}

const normalizeLookupValue = (value?: string | null) =>
  value?.trim().toLowerCase() ?? '';

const buildMinerIndexes = (miners: MinerEvaluation[]): MinerIndexes => {
  const indexes: MinerIndexes = {
    byGithubId: new Map(),
    byUsername: new Map(),
  };
  miners.forEach((miner) => {
    if (miner.githubId) indexes.byGithubId.set(miner.githubId, miner);
    const usernameKey = normalizeLookupValue(miner.githubUsername);
    if (usernameKey) indexes.byUsername.set(usernameKey, miner);
  });
  return indexes;
};

const resolveMinerFromIssue = (
  issue: RecentMirrorIssue,
  indexes: MinerIndexes,
): MinerEvaluation | undefined => {
  if (issue.authorGithubId) {
    const byId = indexes.byGithubId.get(issue.authorGithubId);
    if (byId) return byId;
  }
  const loginKey = normalizeLookupValue(issue.authorLogin);
  if (loginKey) return indexes.byUsername.get(loginKey);
  return undefined;
};

const buildMinerDetailsHref = (githubId: string): string =>
  `/miners/details?githubId=${encodeURIComponent(
    githubId,
  )}&mode=issues&tab=open-issues`;

const formatWholeNumber = (value: number) =>
  Math.round(value).toLocaleString('en-US');

const formatDecimal = (value: number, digits = 1) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/**
 * Builds the author sub-object shared by all three role rows.
 */
const buildDiscovererAuthor = (
  miner: MinerEvaluation,
): DashboardFeaturedDiscovererAuthor => {
  const username = miner.githubUsername ?? miner.githubId ?? 'unknown';
  return {
    githubId: miner.githubId,
    username,
    displayName: miner.githubUsername ?? username,
    usdPerDay: parseNumber(miner.usdPerDay),
    credibility: parseNumber(miner.credibility),
    issueTokenScore: parseNumber(miner.issueTokenScore),
    issueDiscoveryScore: parseNumber(miner.issueDiscoveryScore),
    totalValidSolvedIssues:
      typeof miner.totalValidSolvedIssues === 'number'
        ? miner.totalValidSolvedIssues
        : undefined,
  };
};

const getRoleTone = (
  role: FeaturedDiscovererRole,
): DashboardFeaturedDiscoverer['tone'] => {
  if (role === 'all-time-top') return 'success';
  if (role === 'most-active') return 'neutral';
  return 'warning';
};

/**
 * Collects the mirror-repo names a given miner has filed issues in across
 * the provided issue feed. Used to populate row 1's repo pills from the
 * 7d window sample rather than a static list.
 */
const collectFilerRepos = (
  githubId: string,
  issues: RecentMirrorIssue[],
  indexes: MinerIndexes,
): string[] => {
  const repos = new Set<string>();
  issues.forEach((issue) => {
    const miner = resolveMinerFromIssue(issue, indexes);
    if (miner?.githubId === githubId && issue.repositoryFullName) {
      repos.add(issue.repositoryFullName);
    }
  });
  return [...repos];
};

/**
 * Row 1: all-time top discoverer by `issueDiscoveryScore` (same metric the
 * Discoveries page uses to rank miners). Miner ranking comes from the
 * `/miners` payload so the row renders even before the GitHub Search feed
 * resolves; repo pills enrich from the feed once it arrives.
 */
const pickAllTimeTopDiscoverer = (
  miners: MinerEvaluation[],
  issues: RecentMirrorIssue[],
  indexes: MinerIndexes,
): DashboardFeaturedDiscoverer | undefined => {
  const scored = miners
    .filter((m) => parseNumber(m.issueDiscoveryScore) > 0 && m.githubId)
    .sort(
      (a, b) =>
        parseNumber(b.issueDiscoveryScore) - parseNumber(a.issueDiscoveryScore),
    );
  const winner = scored[0];
  if (!winner || !winner.githubId) return undefined;

  const author = buildDiscovererAuthor(winner);
  return {
    id: `all-time:${winner.githubId}`,
    role: 'all-time-top',
    roleLabel: 'Top discoverer',
    windowLabel: 'All-time',
    author,
    primary: {
      label: 'discovery score',
      value: formatDecimal(author.issueDiscoveryScore ?? 0, 2),
    },
    secondary: {
      label: 'valid solves',
      value: formatWholeNumber(author.totalValidSolvedIssues ?? 0),
    },
    repos: collectFilerRepos(winner.githubId, issues, indexes),
    href: buildMinerDetailsHref(winner.githubId),
    tone: getRoleTone('all-time-top'),
  };
};

/**
 * Collects, per miner, the issues they filed within a given window.
 */
interface FilerAggregate {
  miner: MinerEvaluation;
  issues: RecentMirrorIssue[];
  repos: Set<string>;
}

const aggregateFilers = (
  issues: RecentMirrorIssue[],
  indexes: MinerIndexes,
  window: WindowBounds,
): Map<string, FilerAggregate> => {
  const agg = new Map<string, FilerAggregate>();
  issues.forEach((issue) => {
    const createdAtMs = toTimestamp(issue.createdAt);
    if (!isWithinWindow(createdAtMs, window)) return;

    const miner = resolveMinerFromIssue(issue, indexes);
    if (!miner || !miner.githubId) return;

    const existing = agg.get(miner.githubId);
    if (existing) {
      existing.issues.push(issue);
      existing.repos.add(issue.repositoryFullName);
    } else {
      agg.set(miner.githubId, {
        miner,
        issues: [issue],
        repos: new Set([issue.repositoryFullName]),
      });
    }
  });
  return agg;
};

/**
 * Picks a discoverer using a comparator, widening through
 * `DISCOVERER_WINDOW_LADDER` (24h → 3d → 7d) until a candidate appears.
 * `rejectGithubIds` excludes miners already featured in earlier rows so
 * the section never displays the same miner twice.
 */
const pickDiscovererWithFallback = (
  issues: RecentMirrorIssue[],
  indexes: MinerIndexes,
  now: Date,
  rejectGithubIds: ReadonlySet<string>,
  compare: (a: FilerAggregate, b: FilerAggregate) => number,
  filter?: (agg: FilerAggregate) => boolean,
): { aggregate: FilerAggregate; windowHours: number } | undefined => {
  for (const windowHours of DISCOVERER_WINDOW_LADDER) {
    const bounds = getRollingWindowBounds(now, windowHours);
    const filers = aggregateFilers(issues, indexes, bounds);
    const candidates = [...filers.values()]
      .filter(
        (agg) =>
          !!agg.miner.githubId && !rejectGithubIds.has(agg.miner.githubId),
      )
      .filter((agg) => (filter ? filter(agg) : true))
      .sort(compare);
    if (candidates.length > 0) {
      return { aggregate: candidates[0], windowHours };
    }
  }
  return undefined;
};

const formatWindowLabel = (windowHours: number): string => {
  if (windowHours === ACTIVE_WINDOW_HOURS) return 'Last 24h';
  if (windowHours === INTERMEDIATE_WINDOW_HOURS) return 'Last 3d';
  return 'Last 7d';
};

const getIssueAgeHours = (issue: RecentMirrorIssue, now: Date): number => {
  const ms = toTimestamp(issue.createdAt);
  if (ms === null) return 0;
  return Math.max(0, (now.getTime() - ms) / DASHBOARD_HOUR_MS);
};

const formatAgeLabel = (ageHours: number): string => {
  if (ageHours < 1) {
    const minutes = Math.max(1, Math.round(ageHours * 60));
    return `${minutes}m ago`;
  }
  if (ageHours < 48) return `${Math.round(ageHours)}h ago`;
  const days = Math.round(ageHours / 24);
  return `${days}d ago`;
};

const getLatestIssueAgeHours = (
  issues: RecentMirrorIssue[],
  now: Date,
): number => {
  if (issues.length === 0) return 0;
  return Math.min(...issues.map((i) => getIssueAgeHours(i, now)));
};

/**
 * Row 2: miner who filed the most issues in the active window.
 */
const pickMostActiveDiscoverer = (
  issues: RecentMirrorIssue[],
  indexes: MinerIndexes,
  now: Date,
  rejectGithubIds: ReadonlySet<string>,
): DashboardFeaturedDiscoverer | undefined => {
  const picked = pickDiscovererWithFallback(
    issues,
    indexes,
    now,
    rejectGithubIds,
    (a, b) => {
      if (b.issues.length !== a.issues.length) {
        return b.issues.length - a.issues.length;
      }
      const scoreDelta =
        parseNumber(b.miner.issueDiscoveryScore) -
        parseNumber(a.miner.issueDiscoveryScore);
      if (scoreDelta !== 0) return scoreDelta;
      // Deterministic tiebreakers so the picked row stays stable across
      // refreshes when count and score are both equal (common when the
      // 24h window is mostly empty and every filer scores 0).
      const credDelta =
        parseNumber(b.miner.credibility) - parseNumber(a.miner.credibility);
      if (credDelta !== 0) return credDelta;
      const aName = (a.miner.githubUsername ?? '').toLowerCase();
      const bName = (b.miner.githubUsername ?? '').toLowerCase();
      return aName.localeCompare(bName);
    },
  );
  if (!picked || !picked.aggregate.miner.githubId) return undefined;

  const { aggregate, windowHours } = picked;
  const author = buildDiscovererAuthor(aggregate.miner);
  const latestAgeHours = getLatestIssueAgeHours(aggregate.issues, now);
  return {
    id: `most-active:${aggregate.miner.githubId}`,
    role: 'most-active',
    roleLabel: 'Most active discoverer',
    windowLabel: formatWindowLabel(windowHours),
    author,
    primary: {
      label: aggregate.issues.length === 1 ? 'issue filed' : 'issues filed',
      value: formatWholeNumber(aggregate.issues.length),
    },
    secondary: {
      label: 'last filed',
      value: formatAgeLabel(latestAgeHours),
    },
    repos: [...aggregate.repos],
    href: buildMinerDetailsHref(aggregate.miner.githubId),
    tone: getRoleTone('most-active'),
  };
};

/**
 * Row 3: among filers in the active window, the one with the highest
 * all-time `issueDiscoveryScore` (same metric as the Discoveries page).
 * Requires `issueDiscoveryScore > 0` so the row label ("Highest-earning
 * discoverer") never displays against a zero score.
 */
const pickHighestEarningFiler = (
  issues: RecentMirrorIssue[],
  indexes: MinerIndexes,
  now: Date,
  rejectGithubIds: ReadonlySet<string>,
): DashboardFeaturedDiscoverer | undefined => {
  const picked = pickDiscovererWithFallback(
    issues,
    indexes,
    now,
    rejectGithubIds,
    (a, b) => {
      const delta =
        parseNumber(b.miner.issueDiscoveryScore) -
        parseNumber(a.miner.issueDiscoveryScore);
      if (delta !== 0) return delta;
      return b.issues.length - a.issues.length;
    },
    // Require a non-zero discovery score in the chosen window; otherwise
    // the row 3 label ("Highest-earning discoverer") is misleading and
    // falls through to the count tiebreak, duplicating row 2's intent.
    // This is the guard that forces a 24h → 3d → 7d fallback whenever no
    // filer in the current window has had an issue solved yet.
    (agg) => parseNumber(agg.miner.issueDiscoveryScore) > 0,
  );
  if (!picked || !picked.aggregate.miner.githubId) return undefined;

  const { aggregate, windowHours } = picked;
  const author = buildDiscovererAuthor(aggregate.miner);
  return {
    id: `highest-earning:${aggregate.miner.githubId}`,
    role: 'highest-earning-filer',
    roleLabel: 'Highest-earning discoverer',
    windowLabel: formatWindowLabel(windowHours),
    author,
    primary: {
      label: 'discovery score',
      value: formatDecimal(author.issueDiscoveryScore ?? 0, 2),
    },
    secondary: {
      label: aggregate.issues.length === 1 ? 'issue filed' : 'issues filed',
      value: formatWholeNumber(aggregate.issues.length),
    },
    repos: [...aggregate.repos],
    href: buildMinerDetailsHref(aggregate.miner.githubId),
    tone: getRoleTone('highest-earning-filer'),
  };
};

// Below this previous-window count, percentage deltas (e.g. "+700%" off a
// baseline of 1) are technically correct but visually misleading. We fall
// back to absolute deltas in that regime.
const ABSOLUTE_DELTA_THRESHOLD = 5;

const formatWindowDelta = (currentValue: number, previousValue: number) => {
  if (currentValue === previousValue) return 'flat vs prev 24h';
  if (previousValue <= 0) {
    return currentValue > 0 ? 'new vs prev 24h' : 'flat vs prev 24h';
  }
  const absDelta = currentValue - previousValue;
  if (previousValue < ABSOLUTE_DELTA_THRESHOLD) {
    return `${absDelta > 0 ? '+' : ''}${absDelta} vs prev 24h`;
  }
  const percentChange = (absDelta / previousValue) * 100;
  const rounded = percentChange
    .toFixed(Math.abs(percentChange) >= 10 ? 0 : 1)
    .replace(/\.0$/, '');
  return `${percentChange > 0 ? '+' : ''}${rounded}% vs prev 24h`;
};

const getKpiTone = (
  currentValue: number,
  previousValue: number,
): DashboardDiscoveryKpi['tone'] => {
  if (currentValue > previousValue) return 'positive';
  if (currentValue < previousValue) return 'warning';
  return 'neutral';
};

interface WindowSummary {
  issueCount: number;
  openCount: number;
  filerCount: number;
  repoCount: number;
  totalIssueDiscoveryScore: number;
}

const summarizeWindow = (
  issues: RecentMirrorIssue[],
  indexes: MinerIndexes,
  bounds: WindowBounds,
): WindowSummary => {
  const filers = aggregateFilers(issues, indexes, bounds);
  let issueCount = 0;
  let openCount = 0;
  const repos = new Set<string>();
  let totalIssueDiscoveryScore = 0;
  filers.forEach((agg) => {
    issueCount += agg.issues.length;
    openCount += agg.issues.filter((i) => i.state === 'open').length;
    agg.repos.forEach((r) => repos.add(r));
    totalIssueDiscoveryScore += parseNumber(agg.miner.issueDiscoveryScore);
  });
  return {
    issueCount,
    openCount,
    filerCount: filers.size,
    repoCount: repos.size,
    totalIssueDiscoveryScore,
  };
};

const buildDiscoveryKpis = (
  issues: RecentMirrorIssue[],
  indexes: MinerIndexes,
  miners: MinerEvaluation[],
  now: Date,
): DashboardDiscoveryKpi[] => {
  const current = summarizeWindow(issues, indexes, getRollingWindowBounds(now));
  const previous = summarizeWindow(
    issues,
    indexes,
    getPreviousRollingWindowBounds(now),
  );
  const eligibleMiners = miners.filter((m) => m.isIssueEligible).length;
  const totalAllTimeIssueScore = miners.reduce(
    (sum, m) => sum + parseNumber(m.issueDiscoveryScore),
    0,
  );

  return [
    {
      label: 'Issues filed',
      value: formatWholeNumber(current.issueCount),
      delta: formatWindowDelta(current.issueCount, previous.issueCount),
      tone: getKpiTone(current.issueCount, previous.issueCount),
    },
    {
      label: 'Open',
      value: formatWholeNumber(current.openCount),
      delta: formatWindowDelta(current.openCount, previous.openCount),
      tone: getKpiTone(current.openCount, previous.openCount),
    },
    {
      label: 'Active discoverers',
      value: formatWholeNumber(current.filerCount),
      delta: formatWindowDelta(current.filerCount, previous.filerCount),
      tone: getKpiTone(current.filerCount, previous.filerCount),
    },
    {
      label: 'Eligible miners',
      value: formatWholeNumber(eligibleMiners),
      delta: 'all-time',
    },
    {
      label: 'Total issue score',
      value: formatDecimal(totalAllTimeIssueScore, 0),
      delta: 'all-time',
    },
  ];
};

/**
 * Builds the Featured Discoverers section payload.
 *
 * @param _prs - Reserved for future KPI enrichment (e.g. "solved by"
 *   linkage). Currently unused; kept in the signature so callers don't
 *   need to change when backend fix ships linkedIssues on `/prs`.
 * @param miners - Registered miners. Only issues filed by a registered
 *   miner are eligible for discovery rewards, so non-miner issue authors
 *   are dropped from rows 2 and 3.
 * @param recentMirrorIssues - Issues returned by `useRecentMirrorIssues`
 *   (GitHub Search fallback scoped to the 4 mirror repos).
 * @param now - Injected clock for deterministic tests.
 */
export const buildFeaturedDiscoveries = (
  _prs: CommitLog[],
  miners: MinerEvaluation[],
  recentMirrorIssues: RecentMirrorIssue[] = [],
  now = new Date(),
): DashboardDiscoveryPulse => {
  const indexes = buildMinerIndexes(miners);

  const row1 = pickAllTimeTopDiscoverer(miners, recentMirrorIssues, indexes);

  const excludeAfterRow1 = new Set<string>();
  if (row1?.author.githubId) excludeAfterRow1.add(row1.author.githubId);

  const row2 = pickMostActiveDiscoverer(
    recentMirrorIssues,
    indexes,
    now,
    excludeAfterRow1,
  );

  const excludeAfterRow2 = new Set(excludeAfterRow1);
  if (row2?.author.githubId) excludeAfterRow2.add(row2.author.githubId);

  const row3 = pickHighestEarningFiler(
    recentMirrorIssues,
    indexes,
    now,
    excludeAfterRow2,
  );

  return {
    windowLabel: 'Rolling 24h',
    kpis: buildDiscoveryKpis(recentMirrorIssues, indexes, miners, now),
    discoverers: [row1, row2, row3].filter(
      (row): row is DashboardFeaturedDiscoverer => !!row,
    ),
  };
};
