import { type CommitLog, type MinerEvaluation } from '../../api';
import { isIssueDiscoveryMultiplierPr, parseNumber } from '../../utils';
import {
  DASHBOARD_HOUR_MS,
  isWithinWindow,
  toTimestamp,
  type WindowBounds,
} from './dashboardTime';

export interface DashboardDiscoveryKpi {
  label: string;
  value: string;
  delta?: string;
  tone?: 'positive' | 'neutral' | 'warning';
}

export interface DashboardFeaturedDiscoverer {
  id: string;
  githubId?: string;
  githubUsername?: string;
  name: string;
  avatarUsername?: string;
  roleLabel: string;
  primaryMetric: string;
  primaryMetricLabel: string;
  secondaryMetric?: string;
  secondaryMetricLabel?: string;
  repos: string[];
  href?: string;
  tone?: 'success' | 'neutral' | 'warning';
  credibility?: number;
  /** Earnings in USD per day, aligned with the Top Miners `usdPerDay` value. */
  usdPerDay?: number;
}

export interface DashboardDiscoveryPulse {
  windowLabel: string;
  kpis: DashboardDiscoveryKpi[];
  discoverers: DashboardFeaturedDiscoverer[];
}

/**
 * Externally-fetched issue record used to seed `linkedIssuesOpened` when the
 * `/prs` feed lacks `linkedIssues`. Populated by the dashboard's GitHub Search
 * fallback (see `useDailyDiscoveryFilers`).
 */
export interface DiscoveryIssueRecord {
  repositoryFullName: string;
  number: number;
  createdAt: string;
  authorGithubId?: string | null;
  authorLogin?: string | null;
}

interface DailyDiscovererStats {
  key: string;
  githubId?: string;
  githubUsername?: string;
  name: string;
  avatarUsername?: string;
  repos: Set<string>;
  linkedIssuesOpened: number;
  discoveryPrsMerged: number;
  discoveryScore: number;
  lastActivityMs: number;
  baselineIssueScore: number;
  baselineCredibility: number;
  usdPerDay: number;
}

interface DailyActorIdentity {
  miner?: MinerEvaluation;
  githubId?: string;
  githubUsername?: string;
  hotkey?: string;
}

interface DailyActivitySnapshot {
  linkedIssuesOpened: number;
  discoveryPrsMerged: number;
  discoveryScore: number;
  repos: Set<string>;
  discoverers: Map<string, DailyDiscovererStats>;
}

interface MinerIndexes {
  byGithubId: Map<string, MinerEvaluation>;
  byUsername: Map<string, MinerEvaluation>;
  byHotkey: Map<string, MinerEvaluation>;
}

const DAILY_DISCOVERY_WINDOW_HOURS = 24;
const DISCOVERY_SPOTLIGHT_LIMIT = 3;

export const getRollingWindowBounds = (
  now = new Date(),
  windowHours = DAILY_DISCOVERY_WINDOW_HOURS,
): WindowBounds => {
  const endMs = now.getTime();
  return {
    startMs: endMs - windowHours * DASHBOARD_HOUR_MS,
    endMs,
  };
};

export const getPreviousRollingWindowBounds = (
  now = new Date(),
  windowHours = DAILY_DISCOVERY_WINDOW_HOURS,
): WindowBounds => {
  const current = getRollingWindowBounds(now, windowHours);
  const windowMs = windowHours * DASHBOARD_HOUR_MS;
  return {
    startMs: current.startMs - windowMs,
    endMs: current.startMs,
  };
};

const normalizeLookupValue = (value?: string | null) =>
  value?.trim().toLowerCase() ?? '';

const buildMinerIndexes = (miners: MinerEvaluation[]): MinerIndexes => {
  const indexes: MinerIndexes = {
    byGithubId: new Map(),
    byUsername: new Map(),
    byHotkey: new Map(),
  };

  miners.forEach((miner) => {
    if (miner.githubId) {
      indexes.byGithubId.set(miner.githubId, miner);
    }

    const usernameKey = normalizeLookupValue(miner.githubUsername);
    if (usernameKey) {
      indexes.byUsername.set(usernameKey, miner);
    }

    if (miner.hotkey) {
      indexes.byHotkey.set(miner.hotkey, miner);
    }
  });

  return indexes;
};

const shortHotkey = (hotkey: string) => {
  if (hotkey.length <= 14) return hotkey;
  return `${hotkey.slice(0, 6)}...${hotkey.slice(-4)}`;
};

const getMinerDetailsHref = (githubId?: string) =>
  githubId
    ? `/miners/details?githubId=${encodeURIComponent(
        githubId,
      )}&mode=issues&tab=open-issues`
    : undefined;

const resolveUsernameActor = (
  username: string | null | undefined,
  indexes: MinerIndexes,
): DailyActorIdentity | null => {
  const normalizedUsername = normalizeLookupValue(username);
  if (!normalizedUsername) return null;

  const miner = indexes.byUsername.get(normalizedUsername);
  return {
    miner,
    githubId: miner?.githubId,
    githubUsername: miner?.githubUsername ?? username?.trim(),
  };
};

const resolveGithubIdActor = (
  githubId: string | null | undefined,
  indexes: MinerIndexes,
): DailyActorIdentity | null => {
  if (!githubId) return null;

  const miner = indexes.byGithubId.get(githubId);
  return {
    miner,
    githubId,
    githubUsername: miner?.githubUsername,
  };
};

const resolvePrActor = (
  pr: CommitLog,
  indexes: MinerIndexes,
): DailyActorIdentity | null => {
  if (pr.githubId) {
    const miner = indexes.byGithubId.get(pr.githubId);
    return {
      miner,
      githubId: pr.githubId,
      githubUsername: miner?.githubUsername ?? pr.author,
    };
  }

  return resolveUsernameActor(pr.author, indexes);
};

const getDailyActorKey = (identity: DailyActorIdentity): string | null => {
  if (identity.miner?.githubId) return `github:${identity.miner.githubId}`;
  if (identity.githubId) return `github:${identity.githubId}`;

  const usernameKey = normalizeLookupValue(identity.githubUsername);
  if (usernameKey) return `user:${usernameKey}`;

  if (identity.hotkey) return `hotkey:${identity.hotkey}`;
  return null;
};

const ensureDailyDiscoverer = (
  discoverers: Map<string, DailyDiscovererStats>,
  identity: DailyActorIdentity,
): DailyDiscovererStats | null => {
  const key = getDailyActorKey(identity);
  if (!key) return null;

  const existing = discoverers.get(key);
  if (existing) return existing;

  const miner = identity.miner;
  const githubId = miner?.githubId ?? identity.githubId;
  const githubUsername = miner?.githubUsername ?? identity.githubUsername;
  const name =
    githubUsername ?? githubId ?? shortHotkey(identity.hotkey ?? key);

  const stats: DailyDiscovererStats = {
    key,
    githubId,
    githubUsername,
    name,
    avatarUsername: githubUsername,
    repos: new Set(),
    linkedIssuesOpened: 0,
    discoveryPrsMerged: 0,
    discoveryScore: 0,
    lastActivityMs: 0,
    baselineIssueScore: parseNumber(miner?.issueDiscoveryScore),
    baselineCredibility: parseNumber(miner?.credibility),
    usdPerDay: parseNumber(miner?.usdPerDay),
  };

  discoverers.set(key, stats);
  return stats;
};

const addRepoContext = (
  stats: DailyDiscovererStats,
  repositoryFullName?: string | null,
) => {
  if (repositoryFullName) {
    stats.repos.add(repositoryFullName);
  }
};

const updateLastActivity = (
  stats: DailyDiscovererStats,
  timestamp: number | null,
) => {
  if (timestamp !== null) {
    stats.lastActivityMs = Math.max(stats.lastActivityMs, timestamp);
  }
};

const getLinkedIssueKey = (repositoryFullName: string, issueNumber: number) =>
  `${repositoryFullName.toLowerCase()}#${issueNumber}`;

const getDiscoveryPrScore = (pr: CommitLog) => {
  const tokenScore = parseNumber(pr.tokenScore);
  return tokenScore > 0 ? tokenScore : parseNumber(pr.score);
};

const recordLinkedIssue = (
  snapshot: DailyActivitySnapshot,
  discoverers: Map<string, DailyDiscovererStats>,
  indexes: MinerIndexes,
  seenLinkedIssues: Set<string>,
  window: WindowBounds,
  repoFullName: string,
  issueNumber: number,
  createdAtRaw: string | null | undefined,
  authorGithubId: string | null | undefined,
  authorLogin: string | null | undefined,
) => {
  if (!repoFullName) return;

  const createdAt = toTimestamp(createdAtRaw ?? null);
  if (!isWithinWindow(createdAt, window)) return;

  const key = getLinkedIssueKey(repoFullName, issueNumber);
  if (seenLinkedIssues.has(key)) return;
  seenLinkedIssues.add(key);

  snapshot.linkedIssuesOpened += 1;
  snapshot.repos.add(repoFullName);

  // Resolve the issue filer to a registered miner. Prefer GitHub ID (stable),
  // fall back to login, and bail if neither maps to a miner — only registered
  // miners are eligible for discovery rewards, so non-miner issue authors
  // shouldn't appear in this section.
  let identity = authorGithubId
    ? resolveGithubIdActor(authorGithubId, indexes)
    : null;
  if (!identity?.miner && authorLogin) {
    identity = resolveUsernameActor(authorLogin, indexes);
  }
  if (!identity?.miner) return;

  const stats = ensureDailyDiscoverer(discoverers, identity);
  if (!stats) return;

  stats.linkedIssuesOpened += 1;
  addRepoContext(stats, repoFullName);
  updateLastActivity(stats, createdAt);
};

const buildDailyActivitySnapshot = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  window: WindowBounds,
  externalDiscoveryIssues: DiscoveryIssueRecord[] = [],
): DailyActivitySnapshot => {
  const indexes = buildMinerIndexes(miners);
  const discoverers = new Map<string, DailyDiscovererStats>();
  const seenLinkedIssues = new Set<string>();
  const snapshot: DailyActivitySnapshot = {
    linkedIssuesOpened: 0,
    discoveryPrsMerged: 0,
    discoveryScore: 0,
    repos: new Set(),
    discoverers,
  };

  prs.forEach((pr) => {
    const mergedAt = toTimestamp(pr.mergedAt);
    const isMergedDiscoveryPr =
      isWithinWindow(mergedAt, window) && isIssueDiscoveryMultiplierPr(pr);

    if (isMergedDiscoveryPr) {
      const identity = resolvePrActor(pr, indexes);
      const score = getDiscoveryPrScore(pr);

      snapshot.discoveryPrsMerged += 1;
      snapshot.discoveryScore += score;

      const prStats = identity
        ? ensureDailyDiscoverer(discoverers, identity)
        : null;
      if (prStats) {
        prStats.discoveryPrsMerged += 1;
        prStats.discoveryScore += score;
        addRepoContext(prStats, pr.repository);
        updateLastActivity(prStats, mergedAt);
      }
    }

    // Walk linked issues for every PR (not just merged-discovery ones in the
    // window) so that an issue opened today still counts when its closing PR
    // is still open or has a different lifecycle state. Today the `/prs` feed
    // never returns this field, but the loop is here so the section
    // self-heals once backend ships fix (B) — see TODO above
    // `buildDailyDiscovererRows`.
    pr.linkedIssues?.forEach((issue) => {
      recordLinkedIssue(
        snapshot,
        discoverers,
        indexes,
        seenLinkedIssues,
        window,
        pr.repository ?? '',
        issue.number,
        issue.createdAt,
        issue.authorGithubId,
        null,
      );
    });
  });

  // Frontend GitHub-Search fallback: feed externally-fetched issues into the
  // same accounting path. Dedup against any in-PR linkedIssues via the shared
  // `seenLinkedIssues` set.
  externalDiscoveryIssues.forEach((issue) => {
    recordLinkedIssue(
      snapshot,
      discoverers,
      indexes,
      seenLinkedIssues,
      window,
      issue.repositoryFullName,
      issue.number,
      issue.createdAt,
      issue.authorGithubId,
      issue.authorLogin,
    );
  });

  return snapshot;
};

const formatWholeNumber = (value: number) =>
  Math.round(value).toLocaleString('en-US');

const formatDailyDelta = (currentValue: number, previousValue: number) => {
  if (currentValue === previousValue) return 'flat vs prev 24h';
  if (previousValue <= 0) {
    return currentValue > 0 ? 'new vs prev 24h' : 'flat vs prev 24h';
  }

  const percentChange = ((currentValue - previousValue) / previousValue) * 100;
  const rounded = percentChange
    .toFixed(Math.abs(percentChange) >= 10 ? 0 : 1)
    .replace(/\.0$/, '');

  return `${percentChange > 0 ? '+' : ''}${rounded}% vs prev 24h`;
};

const getDailyKpiTone = (
  currentValue: number,
  previousValue: number,
): DashboardDiscoveryKpi['tone'] => {
  if (currentValue > previousValue) return 'positive';
  if (currentValue < previousValue) return 'warning';
  return 'neutral';
};

const getIssueDiscovererCount = (snapshot: DailyActivitySnapshot) =>
  [...snapshot.discoverers.values()].filter(
    (stats) => stats.linkedIssuesOpened > 0,
  ).length;

const mapNewLinkedIssuesKpi = (
  current: DailyActivitySnapshot,
  previous: DailyActivitySnapshot,
): DashboardDiscoveryKpi => {
  return {
    label: 'New linked issues',
    value: formatWholeNumber(current.linkedIssuesOpened),
    delta: formatDailyDelta(
      current.linkedIssuesOpened,
      previous.linkedIssuesOpened,
    ),
    tone: getDailyKpiTone(
      current.linkedIssuesOpened,
      previous.linkedIssuesOpened,
    ),
  };
};

const sortRepos = (repos: Set<string>) =>
  [...repos].sort((a, b) => a.localeCompare(b));

const formatIssueCount = (value: number, singular: string) =>
  `${formatWholeNumber(value)} ${singular}${value === 1 ? '' : 's'}`;

const toDailyDiscoverer = (
  stats: DailyDiscovererStats,
  roleLabel: string,
  primaryMetric: string,
  primaryMetricLabel: string,
  options?: {
    secondaryMetric?: string;
    secondaryMetricLabel?: string;
    tone?: DashboardFeaturedDiscoverer['tone'];
  },
): DashboardFeaturedDiscoverer => ({
  id: stats.key,
  githubId: stats.githubId,
  githubUsername: stats.githubUsername,
  name: stats.name,
  avatarUsername: stats.avatarUsername,
  roleLabel,
  primaryMetric,
  primaryMetricLabel,
  secondaryMetric: options?.secondaryMetric,
  secondaryMetricLabel: options?.secondaryMetricLabel,
  repos: sortRepos(stats.repos),
  href: getMinerDetailsHref(stats.githubId),
  tone: options?.tone ?? 'success',
  credibility: stats.baselineCredibility,
  usdPerDay: stats.usdPerDay,
});

// A "discoverer" is a miner who FILES an issue (per DiscoveriesPage copy):
// > "Miners earn discovery rewards by filing quality issues that others solve
// > via merged PRs."
// PR authors who merge discovery-multiplier PRs are solvers, not discoverers,
// and belong in the OSS / contributor flows — not here.
//
// Today this list is populated via `useDailyDiscoveryFilers`, a frontend
// fallback that hits GitHub's Issues Search API directly because none of our
// own endpoints expose the issue filer for fresh, non-bountied issues:
//   - `/prs`                          → never returns `linkedIssues` (checked
//                                       3382 PRs: 0 have the field).
//   - `/repos/{repo}/issues`          → has fresh issues with `createdAt`,
//                                       `closedAt`, `prNumber`, `title`. But
//                                       `authorLogin`/`authorGithubId` are
//                                       optional in the model and **never
//                                       populated** by the current API
//                                       (verified across 249 records).
//   - `/issues`                       → only registered bounty records;
//                                       fresh non-bountied issues are absent.
//   - `/issues/{id}/details`          → has `authorLogin` but only for
//                                       bountied issues.
//   - `/miners/{id}`                  → aggregate counters only.
//   - `/miners/{id}/issues` (mirror)  → has the right shape but lags ~85h
//                                       behind GitHub.
//
// Any ONE of these backend changes lets us drop the GitHub-Search fallback
// (lower latency, no third-party rate-limit risk):
//   (A) Populate `authorLogin` + `authorGithubId` on `/repos/{repo}/issues`
//       (smallest diff — model already declares both fields optional).
//   (B) Add `linkedIssues: [{ number, authorGithubId, createdAt, state }]` to
//       the /prs response.
//   (C) Expose a dedicated `/discoveries/recent?windowHours=24` aggregate
//       endpoint with authorship info.
//   (D) Refresh the mirror snapshot hourly-or-less; shape is already correct.
const buildDailyDiscovererRows = (
  snapshot: DailyActivitySnapshot,
): DashboardFeaturedDiscoverer[] => {
  return [...snapshot.discoverers.values()]
    .filter((entry) => entry.linkedIssuesOpened > 0)
    .sort((a, b) => {
      const issueDiff = b.linkedIssuesOpened - a.linkedIssuesOpened;
      if (issueDiff !== 0) return issueDiff;

      const baselineDiff = b.baselineIssueScore - a.baselineIssueScore;
      if (baselineDiff !== 0) return baselineDiff;

      return b.lastActivityMs - a.lastActivityMs;
    })
    .slice(0, DISCOVERY_SPOTLIGHT_LIMIT)
    .map((stats, index) =>
      toDailyDiscoverer(
        stats,
        index === 0 ? 'Top 24h Issue Discoverer' : '24h Issue Discoverer',
        formatIssueCount(stats.linkedIssuesOpened, 'linked issue'),
        'opened in 24h',
        {
          secondaryMetric: formatWholeNumber(stats.baselineIssueScore),
          secondaryMetricLabel: 'baseline discovery score',
        },
      ),
    );
};

const mapDailyDiscoveryKpis = (
  current: DailyActivitySnapshot,
  previous: DailyActivitySnapshot,
): DashboardDiscoveryKpi[] => [
  {
    label: 'Discovery solves',
    value: formatWholeNumber(current.discoveryPrsMerged),
    delta: formatDailyDelta(
      current.discoveryPrsMerged,
      previous.discoveryPrsMerged,
    ),
    tone: getDailyKpiTone(
      current.discoveryPrsMerged,
      previous.discoveryPrsMerged,
    ),
  },
  {
    label: 'Discovery score',
    value: formatWholeNumber(current.discoveryScore),
    delta: formatDailyDelta(current.discoveryScore, previous.discoveryScore),
    tone: getDailyKpiTone(current.discoveryScore, previous.discoveryScore),
  },
  mapNewLinkedIssuesKpi(current, previous),
  {
    label: 'Active discoverers',
    value: formatWholeNumber(getIssueDiscovererCount(current)),
    delta: formatDailyDelta(
      getIssueDiscovererCount(current),
      getIssueDiscovererCount(previous),
    ),
    tone: getDailyKpiTone(
      getIssueDiscovererCount(current),
      getIssueDiscovererCount(previous),
    ),
  },
  {
    label: 'Repos touched',
    value: formatWholeNumber(current.repos.size),
    delta: formatDailyDelta(current.repos.size, previous.repos.size),
    tone: getDailyKpiTone(current.repos.size, previous.repos.size),
  },
];

export const buildDailyDiscoveryPulse = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  now = new Date(),
  externalDiscoveryIssues: DiscoveryIssueRecord[] = [],
): DashboardDiscoveryPulse => {
  const currentSnapshot = buildDailyActivitySnapshot(
    prs,
    miners,
    getRollingWindowBounds(now),
    externalDiscoveryIssues,
  );
  const previousSnapshot = buildDailyActivitySnapshot(
    prs,
    miners,
    getPreviousRollingWindowBounds(now),
    externalDiscoveryIssues,
  );
  const dailyDiscoverers = buildDailyDiscovererRows(currentSnapshot);

  return {
    windowLabel: 'Last 24h',
    kpis: mapDailyDiscoveryKpis(currentSnapshot, previousSnapshot),
    discoverers: dailyDiscoverers,
  };
};
