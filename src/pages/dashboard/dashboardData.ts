/**
 * Pure dashboard data builders.
 *
 * This module converts raw PR, issue, and miner datasets into UI-facing models
 * for trends, overview sections, KPIs, and featured contributors.
 *
 * Most dashboard sections are driven by the caller-provided time range.
 * Featured contributors intentionally use a fixed 35-day lookback window.
 */
import {
  type CommitLog,
  type MinerEvaluation,
  type Repository,
} from '../../api';
import { type IssueBounty } from '../../api/models/Issues';
import { getPrStatusLabel, parseNumber } from '../../utils';
import {
  DASHBOARD_DAY_MS,
  DASHBOARD_HOUR_MS,
  DASHBOARD_WEEK_MS,
  isWithinWindow,
  toTimestamp,
  type WindowBounds,
} from './dashboardTime';
export {
  buildDailyDiscoveryPulse,
  getPreviousRollingWindowBounds,
  getRollingWindowBounds,
} from './dashboardDiscoveryPulse';
export type {
  DashboardDiscoveryKpi,
  DashboardDiscoveryPulse,
  DashboardFeaturedDiscoverer,
} from './dashboardDiscoveryPulse';
export type { WindowBounds } from './dashboardTime';

export type PresetTimeRange = '1d' | '7d' | '35d';
export type TrendTimeRange = PresetTimeRange | 'all';
export type TrendSeriesKey =
  | 'mergedPrs'
  | 'issuesResolved'
  | 'prsOpened'
  | 'issuesOpened';

export interface DashboardTrendSeries {
  key: TrendSeriesKey;
  values: number[];
}

export interface DashboardOverviewMetric {
  label: string;
  value: number;
  delta: string;
}

export interface DashboardOverviewPool {
  metrics: DashboardOverviewMetric[];
  chartSegments: Array<{ label: string; value: number }>;
  chartCenterLabel: string;
}

export interface DashboardOverviewSection {
  title: string;
  eligible: DashboardOverviewPool;
  ineligible: DashboardOverviewPool;
}

export interface DashboardKpi {
  title: string;
  value: number;
  subtitle: string;
}

export interface DashboardFeaturedContributor {
  featuredLabel: string;
  githubId: string;
  githubUsername?: string;
  name: string;
  metrics: Array<{
    value: string;
    unit: string;
  }>;
  repos: string[];
  /** Earnings in USD per day, aligned with the Top Miners `usdPerDay` value. */
  usdPerDay?: number;
  /** Credibility as 0-1 fraction (rendered as donut ring). */
  credibility?: number;
  /** Segments for the credibility donut (e.g. Merged/Open/Closed). */
  segments?: Array<{ label: string; value: number }>;
  // Rich numeric fields for visual layouts (stat tiles, gauges, etc.)
  score?: number;
  mergedPrs?: number;
  totalPrs?: number;
  closedPrs?: number;
  uniqueReposCount?: number;
}

type FeaturedWorkStatusTone = 'merged' | 'open' | 'closed';

export interface FeaturedWorkPr {
  prNumber: number;
  title: string;
  score: number;
  author: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  statusLabel: string;
  statusTone: FeaturedWorkStatusTone;
}

export interface FeaturedWorkRepo {
  repository: string;
  prCount: number;
  totalScore: number;
  windowLabel: string;
  prs: FeaturedWorkPr[];
}

interface FeaturedWorkConfig {
  readonly repoCount: number;
  readonly prsPerRepo: number;
  readonly windowHours: number;
  readonly windowLabel: string;
}

const GITTENSOR_START_MS = Date.UTC(2025, 11, 1, 0, 0, 0);

const RANGE_CONFIG: Record<
  PresetTimeRange,
  { windowMs: number; bucketMs: number; points: number }
> = {
  '1d': {
    windowMs: DASHBOARD_DAY_MS,
    bucketMs: 3 * DASHBOARD_HOUR_MS,
    points: 8,
  },
  '7d': {
    windowMs: 7 * DASHBOARD_DAY_MS,
    bucketMs: DASHBOARD_DAY_MS,
    points: 7,
  },
  '35d': {
    windowMs: 35 * DASHBOARD_DAY_MS,
    bucketMs: DASHBOARD_DAY_MS,
    points: 35,
  },
};

const TREND_SERIES_KEYS: TrendSeriesKey[] = [
  'mergedPrs',
  'issuesResolved',
  'prsOpened',
  'issuesOpened',
];
const CURRENT_LOOKBACK_WINDOW: PresetTimeRange = '35d';

export const getRangeConfig = (range: PresetTimeRange) => RANGE_CONFIG[range];

export const getWindowBounds = (
  range: TrendTimeRange,
  now = new Date(),
): WindowBounds => {
  if (range === 'all') {
    return { startMs: GITTENSOR_START_MS, endMs: now.getTime() };
  }

  const { windowMs } = getRangeConfig(range);
  const endMs = now.getTime();
  return { startMs: endMs - windowMs, endMs };
};

export const getPreviousWindowBounds = (
  range: TrendTimeRange,
  now = new Date(),
): WindowBounds | null => {
  if (range === 'all') {
    return null;
  }

  const current = getWindowBounds(range, now);
  const { windowMs } = getRangeConfig(range);
  return {
    startMs: current.startMs - windowMs,
    endMs: current.startMs,
  };
};

const getUtcWeekStart = (timestamp: number) => {
  const date = new Date(timestamp);
  const dayOfWeek = date.getUTCDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - diffToMonday,
  );
};

const formatTrendBucketLabel = (timestamp: number, range: TrendTimeRange) => {
  if (range === '1d') {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
};

const buildTrendBuckets = (
  timestamps: Array<number | null>,
  range: TrendTimeRange,
  now = new Date(),
): Array<{ startMs: number; endMs: number; label: string }> => {
  if (range !== 'all') {
    const { points, bucketMs, windowMs } = getRangeConfig(range);
    const startMs = now.getTime() - windowMs;

    return Array.from({ length: points }, (_, index) => {
      const bucketStart = startMs + index * bucketMs;
      return {
        startMs: bucketStart,
        endMs: bucketStart + bucketMs,
        label: formatTrendBucketLabel(bucketStart, range),
      };
    });
  }

  const firstWeekStart = getUtcWeekStart(GITTENSOR_START_MS);
  const currentWeekStart = getUtcWeekStart(now.getTime());
  const endExclusive = currentWeekStart + DASHBOARD_WEEK_MS;
  const buckets: Array<{ startMs: number; endMs: number; label: string }> = [];

  for (
    let bucketStart = firstWeekStart;
    bucketStart < endExclusive;
    bucketStart += DASHBOARD_WEEK_MS
  ) {
    buckets.push({
      startMs: bucketStart,
      endMs: bucketStart + DASHBOARD_WEEK_MS,
      label: formatTrendBucketLabel(bucketStart, range),
    });
  }

  return buckets;
};

const bucketTimestamps = (
  timestamps: Array<number | null>,
  buckets: Array<{ startMs: number; endMs: number; label: string }>,
) => {
  const values = Array.from({ length: buckets.length }, () => 0);

  timestamps.forEach((timestamp) => {
    if (timestamp === null) return;

    for (let index = 0; index < buckets.length; index += 1) {
      const bucket = buckets[index];
      if (timestamp >= bucket.startMs && timestamp < bucket.endMs) {
        values[index] += 1;
        break;
      }
    }
  });

  return values;
};

const optionalCredibilityMetrics = (
  credibility: unknown,
): Array<{ value: string; unit: string }> => {
  const n = parseNumber(credibility as number);
  return n > 0 ? [{ value: `${Math.round(n * 100)}%`, unit: 'Cred.' }] : [];
};

const formatDelta = (
  currentValue: number,
  previousValue: number,
  decimals = 2,
) => {
  if (currentValue === 0 && previousValue === 0) return '0%';
  if (previousValue === 0) return '0%';

  const percentChange = ((currentValue - previousValue) / previousValue) * 100;
  const rounded = percentChange.toFixed(decimals).replace(/\.?0+$/, '');

  return `${percentChange > 0 ? '+' : ''}${rounded}%`;
};

export const buildDashboardTrendData = (
  prs: CommitLog[],
  issues: IssueBounty[],
  range: TrendTimeRange,
  now = new Date(),
): { labels: string[]; series: DashboardTrendSeries[] } => {
  const mergedPrTimestamps = prs.map((pr) => toTimestamp(pr.mergedAt));
  const openedPrTimestamps = prs.map((pr) => toTimestamp(pr.prCreatedAt));
  const openedIssueTimestamps = issues.map((issue) =>
    toTimestamp(issue.createdAt),
  );
  const resolvedIssueTimestamps = issues
    .filter((issue) => issue.status === 'completed')
    .map((issue) => toTimestamp(issue.completedAt));
  const buckets = buildTrendBuckets(
    [
      ...mergedPrTimestamps,
      ...openedPrTimestamps,
      ...openedIssueTimestamps,
      ...resolvedIssueTimestamps,
    ],
    range,
    now,
  );
  const mergedPrValues = bucketTimestamps(mergedPrTimestamps, buckets);
  const openedPrValues = bucketTimestamps(openedPrTimestamps, buckets);
  const openedIssueValues = bucketTimestamps(openedIssueTimestamps, buckets);
  const resolvedIssueValues = bucketTimestamps(
    resolvedIssueTimestamps,
    buckets,
  );

  const seriesByKey: Record<TrendSeriesKey, number[]> = {
    mergedPrs: mergedPrValues,
    issuesResolved: resolvedIssueValues,
    prsOpened: openedPrValues,
    issuesOpened: openedIssueValues,
  };

  return {
    labels: buckets.map((bucket) => bucket.label),
    series: TREND_SERIES_KEYS.map((key) => ({
      key,
      values: seriesByKey[key],
    })),
  };
};

const getPrOverviewMetrics = (prs: CommitLog[], window: WindowBounds) => {
  const statusCounts = {
    total: 0,
    merged: 0,
    open: 0,
    closed: 0,
  };

  prs.forEach((pr) => {
    const normalizedState = getPrStatusLabel(pr);
    const createdInWindow = isWithinWindow(toTimestamp(pr.prCreatedAt), window);
    const mergedInWindow = isWithinWindow(toTimestamp(pr.mergedAt), window);
    // API does not currently return closedAt for PRs — fall back to
    // prCreatedAt so closed PRs are still tracked within the window.
    const closedInWindow = isWithinWindow(
      toTimestamp(pr.closedAt ?? pr.prCreatedAt),
      window,
    );

    if (createdInWindow) {
      statusCounts.open += 1;
      statusCounts.total += 1;
    }

    if (mergedInWindow) {
      statusCounts.merged += 1;
      statusCounts.total += 1;
    }

    if (normalizedState === 'Closed' && closedInWindow) {
      statusCounts.closed += 1;
      statusCounts.total += 1;
    }
  });

  return {
    total: statusCounts.total,
    merged: statusCounts.merged,
    open: statusCounts.open,
    closed: statusCounts.closed,
  };
};

// Issue discovery metrics are sourced from per-miner aggregates (which
// reflect every discovered issue) rather than the /issues endpoint (which
// only returns bounty-backed issues — far fewer). Aggregates are all-time
// totals, so the Issue Discoveries card is not windowed by the range filter.
const getIssueOverviewMetricsFromMiners = (miners: MinerEvaluation[]) => {
  let solved = 0;
  let closed = 0;
  let open = 0;
  miners.forEach((miner) => {
    solved += miner.totalSolvedIssues ?? 0;
    closed += miner.totalClosedIssues ?? 0;
    open += miner.totalOpenIssues ?? 0;
  });
  return {
    total: solved + open + closed,
    solved,
    open,
    closed,
  };
};

const formatCenterPercent = (resolved: number, total: number) => {
  if (total <= 0) return '0%';
  return `${((resolved / total) * 100).toFixed(1)}%`;
};

export const buildDashboardOverview = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  range: TrendTimeRange,
  now = new Date(),
): DashboardOverviewSection[] => {
  const currentWindow = getWindowBounds(range, now);
  const previousWindow = getPreviousWindowBounds(range, now);

  const eligibleIds = new Set(
    miners.filter((m) => m.isEligible).map((m) => m.githubId),
  );
  const eligiblePrs = prs.filter(
    (pr) => pr.githubId && eligibleIds.has(pr.githubId),
  );
  const ineligiblePrs = prs.filter(
    (pr) => !pr.githubId || !eligibleIds.has(pr.githubId),
  );

  const eligibleMiners = miners.filter((m) => m.isIssueEligible);
  const ineligibleMiners = miners.filter((m) => !m.isIssueEligible);

  const currentEligiblePrMetrics = getPrOverviewMetrics(
    eligiblePrs,
    currentWindow,
  );
  const previousEligiblePrMetrics = previousWindow
    ? getPrOverviewMetrics(eligiblePrs, previousWindow)
    : null;

  const currentIneligiblePrMetrics = getPrOverviewMetrics(
    ineligiblePrs,
    currentWindow,
  );
  const previousIneligiblePrMetrics = previousWindow
    ? getPrOverviewMetrics(ineligiblePrs, previousWindow)
    : null;

  const eligibleIssueMetrics =
    getIssueOverviewMetricsFromMiners(eligibleMiners);
  const ineligibleIssueMetrics =
    getIssueOverviewMetricsFromMiners(ineligibleMiners);

  const getMetricDelta = (currentValue: number, previousValue?: number) =>
    range === 'all' || previousValue === undefined
      ? '0%'
      : formatDelta(currentValue, previousValue);

  const buildPrPool = (
    current: ReturnType<typeof getPrOverviewMetrics>,
    previous: ReturnType<typeof getPrOverviewMetrics> | null,
  ): DashboardOverviewPool => ({
    chartSegments: [
      { label: 'Merged', value: current.merged },
      { label: 'Open', value: current.open },
      { label: 'Closed', value: current.closed },
    ],
    chartCenterLabel: formatCenterPercent(
      current.merged,
      current.merged + current.closed,
    ),
    metrics: [
      {
        label: 'Total',
        value: current.total,
        delta: getMetricDelta(current.total, previous?.total),
      },
      {
        label: 'Merged',
        value: current.merged,
        delta: getMetricDelta(current.merged, previous?.merged),
      },
      {
        label: 'Open',
        value: current.open,
        delta: getMetricDelta(current.open, previous?.open),
      },
      {
        label: 'Closed',
        value: current.closed,
        delta: getMetricDelta(current.closed, previous?.closed),
      },
    ],
  });

  const buildIssuePool = (
    issueMetrics: ReturnType<typeof getIssueOverviewMetricsFromMiners>,
  ): DashboardOverviewPool => ({
    chartSegments: [
      { label: 'Solved', value: issueMetrics.solved },
      { label: 'Open', value: issueMetrics.open },
      { label: 'Closed', value: issueMetrics.closed },
    ],
    chartCenterLabel: formatCenterPercent(
      issueMetrics.solved,
      issueMetrics.solved + issueMetrics.closed,
    ),
    // Issue metrics come from per-miner aggregates (all-time totals), so
    // there is no previous-window comparison available — deltas are '0%'.
    metrics: [
      { label: 'Total', value: issueMetrics.total, delta: '0%' },
      { label: 'Solved', value: issueMetrics.solved, delta: '0%' },
      { label: 'Open', value: issueMetrics.open, delta: '0%' },
      { label: 'Closed', value: issueMetrics.closed, delta: '0%' },
    ],
  });

  return [
    {
      title: 'OSS Contributions',
      eligible: buildPrPool(
        currentEligiblePrMetrics,
        previousEligiblePrMetrics,
      ),
      ineligible: buildPrPool(
        currentIneligiblePrMetrics,
        previousIneligiblePrMetrics,
      ),
    },
    {
      title: 'Issue Discoveries',
      eligible: buildIssuePool(eligibleIssueMetrics),
      ineligible: buildIssuePool(ineligibleIssueMetrics),
    },
  ];
};

export const buildDashboardKpis = (
  prs: CommitLog[],
  issues: IssueBounty[],
  range: TrendTimeRange,
  now = new Date(),
): DashboardKpi[] => {
  const window = getWindowBounds(range, now);
  const mergedWindowPrs = prs.filter((pr) =>
    isWithinWindow(toTimestamp(pr.mergedAt), window),
  );
  const solvedIssues = issues.filter(
    (issue) =>
      issue.status === 'completed' &&
      isWithinWindow(toTimestamp(issue.completedAt), window),
  );

  const totalCommits = mergedWindowPrs.reduce(
    (sum, pr) => sum + parseNumber(pr.commitCount),
    0,
  );
  const totalIssuesSolved = solvedIssues.length;
  const totalLinesCommitted = mergedWindowPrs.reduce(
    (sum, pr) => sum + parseNumber(pr.additions) + parseNumber(pr.deletions),
    0,
  );
  const totalRepositories = new Set(
    mergedWindowPrs.map((pr) => pr.repository).filter(Boolean),
  ).size;

  return [
    {
      title: 'Total Commits',
      value: totalCommits,
      subtitle: 'Total PR snapshots',
    },
    {
      title: 'Issues Solved',
      value: totalIssuesSolved,
      subtitle: 'Problem resolved and closed',
    },
    {
      title: 'Total Lines Committed',
      value: totalLinesCommitted,
      subtitle: 'Cumulative code contributions',
    },
    {
      title: 'Total Repositories',
      value: totalRepositories,
      subtitle: 'Projects contributed to',
    },
  ];
};

const getTopContributorRepos = (prs: CommitLog[], githubId: string) => {
  const currentWindow = getWindowBounds(CURRENT_LOOKBACK_WINDOW);
  const repoStats = new Map<
    string,
    { mergedPrs: number; totalScore: number; lastMergedAt: number }
  >();

  prs.forEach((pr) => {
    const mergedAt = toTimestamp(pr.mergedAt);
    if (
      pr.githubId !== githubId ||
      !pr.repository ||
      !isWithinWindow(mergedAt, currentWindow)
    ) {
      return;
    }

    const existing = repoStats.get(pr.repository) ?? {
      mergedPrs: 0,
      totalScore: 0,
      lastMergedAt: 0,
    };

    existing.mergedPrs += 1;
    existing.totalScore += parseNumber(pr.score);
    existing.lastMergedAt = Math.max(existing.lastMergedAt, mergedAt ?? 0);

    repoStats.set(pr.repository, existing);
  });

  return [...repoStats.entries()]
    .sort((a, b) => {
      const mergedPrDiff = b[1].mergedPrs - a[1].mergedPrs;
      if (mergedPrDiff !== 0) return mergedPrDiff;

      const scoreDiff = b[1].totalScore - a[1].totalScore;
      if (scoreDiff !== 0) return scoreDiff;

      const mergedAtDiff = b[1].lastMergedAt - a[1].lastMergedAt;
      if (mergedAtDiff !== 0) return mergedAtDiff;

      return a[0].localeCompare(b[0]);
    })
    .slice(0, 3)
    .map(([repo]) => repo);
};

const buildMinerRichFields = (
  m: MinerEvaluation,
  scoreOverride?: number,
): Required<
  Pick<
    DashboardFeaturedContributor,
    | 'score'
    | 'credibility'
    | 'mergedPrs'
    | 'totalPrs'
    | 'closedPrs'
    | 'uniqueReposCount'
    | 'usdPerDay'
  >
> => ({
  score: scoreOverride ?? Math.round(parseNumber(m.totalScore)),
  credibility: parseNumber(m.credibility),
  mergedPrs: parseNumber(m.totalMergedPrs),
  totalPrs: parseNumber(m.totalPrs),
  closedPrs: parseNumber(m.totalClosedPrs),
  uniqueReposCount: parseNumber(m.uniqueReposCount),
  usdPerDay: parseNumber(m.usdPerDay),
});

const buildMinerSegments = (
  m: MinerEvaluation,
): Array<{ label: string; value: number }> => [
  { label: 'Merged', value: parseNumber(m.totalMergedPrs) },
  { label: 'Open', value: parseNumber(m.totalOpenPrs) },
  { label: 'Closed', value: parseNumber(m.totalClosedPrs) },
];

const getHighestScoringMergedAuthor = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  exclude: Set<string> = new Set(),
): DashboardFeaturedContributor | undefined => {
  const currentWindow = getWindowBounds(CURRENT_LOOKBACK_WINDOW);

  const topPr = [...prs]
    .filter(
      (pr) =>
        !!pr.githubId &&
        !exclude.has(pr.githubId) &&
        isWithinWindow(toTimestamp(pr.mergedAt), currentWindow),
    )
    .sort((a, b) => {
      const scoreDiff = parseNumber(b.score) - parseNumber(a.score);
      if (scoreDiff !== 0) return scoreDiff;

      const mergedAtDiff =
        (toTimestamp(b.mergedAt) ?? 0) - (toTimestamp(a.mergedAt) ?? 0);
      if (mergedAtDiff !== 0) return mergedAtDiff;

      return b.pullRequestNumber - a.pullRequestNumber;
    })[0];

  if (!topPr?.githubId) return undefined;

  const miner = miners.find((m) => m.githubId === topPr.githubId);
  const prScore = Math.round(parseNumber(topPr.score));
  const rich = miner ? buildMinerRichFields(miner, prScore) : undefined;
  return {
    githubId: topPr.githubId,
    githubUsername: topPr.author || undefined,
    featuredLabel: 'Highest-Scoring PR Author',
    name: topPr.author ?? topPr.githubId,
    score: prScore,
    ...(rich ?? {}),
    metrics: [
      { value: prScore.toLocaleString(), unit: 'Score' },
      ...optionalCredibilityMetrics(miner?.credibility),
    ],
    repos: topPr.repository ? [topPr.repository] : [],
    segments: miner ? buildMinerSegments(miner) : [],
  };
};

const pickTopOssContributor = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  exclude: Set<string> = new Set(),
): DashboardFeaturedContributor | undefined => {
  const topOssMiner = [...miners]
    .sort((a, b) => {
      const scoreDiff = parseNumber(b.totalScore) - parseNumber(a.totalScore);
      if (scoreDiff !== 0) return scoreDiff;

      const mergedPrDiff = (b.totalMergedPrs ?? 0) - (a.totalMergedPrs ?? 0);
      if (mergedPrDiff !== 0) return mergedPrDiff;

      return a.id - b.id;
    })
    .find(
      (miner) =>
        parseNumber(miner.totalScore) > 0 && !exclude.has(miner.githubId),
    );

  if (!topOssMiner) return undefined;

  const rich = buildMinerRichFields(topOssMiner);
  return {
    featuredLabel: 'Top OSS Miner',
    githubId: topOssMiner.githubId,
    githubUsername: topOssMiner.githubUsername,
    name: topOssMiner.githubUsername ?? topOssMiner.githubId,
    ...rich,
    metrics: [
      { value: rich.score.toLocaleString(), unit: 'Score' },
      ...optionalCredibilityMetrics(topOssMiner.credibility),
    ],
    repos: getTopContributorRepos(prs, topOssMiner.githubId),
    segments: buildMinerSegments(topOssMiner),
  };
};

const pickMostMergedPrMiner = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  exclude: Set<string> = new Set(),
): DashboardFeaturedContributor | undefined => {
  const mostMergedPrMiner = [...miners]
    .filter((m) => !exclude.has(m.githubId))
    .sort((a, b) => {
      const diff = (b.totalMergedPrs ?? 0) - (a.totalMergedPrs ?? 0);
      if (diff !== 0) return diff;
      return b.totalScore - a.totalScore;
    })[0];

  if (!mostMergedPrMiner) return undefined;

  const rich = buildMinerRichFields(mostMergedPrMiner);
  return {
    featuredLabel: 'Most Merged PRs',
    githubId: mostMergedPrMiner.githubId,
    githubUsername: mostMergedPrMiner.githubUsername,
    name: mostMergedPrMiner.githubUsername ?? mostMergedPrMiner.githubId,
    ...rich,
    metrics: [
      { value: `${mostMergedPrMiner.totalMergedPrs ?? 0}`, unit: 'Merged' },
      ...optionalCredibilityMetrics(mostMergedPrMiner.credibility),
    ],
    repos: getTopContributorRepos(prs, mostMergedPrMiner.githubId),
    segments: buildMinerSegments(mostMergedPrMiner),
  };
};

const pickHighestTokenScoreMiner = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  exclude: Set<string> = new Set(),
): DashboardFeaturedContributor | undefined => {
  const top = [...miners]
    .filter(
      (m) => parseNumber(m.totalTokenScore) > 0 && !exclude.has(m.githubId),
    )
    .sort((a, b) => {
      const diff =
        parseNumber(b.totalTokenScore) - parseNumber(a.totalTokenScore);
      return diff !== 0 ? diff : a.id - b.id;
    })[0];

  if (!top) return undefined;

  const rich = buildMinerRichFields(top);
  return {
    featuredLabel: 'Highest Token Score',
    githubId: top.githubId,
    githubUsername: top.githubUsername,
    name: top.githubUsername ?? top.githubId,
    ...rich,
    metrics: [
      {
        value: Math.round(parseNumber(top.totalTokenScore)).toLocaleString(),
        unit: 'Tokens',
      },
      ...optionalCredibilityMetrics(top.credibility),
    ],
    repos: getTopContributorRepos(prs, top.githubId),
    segments: buildMinerSegments(top),
  };
};

export const buildFeaturedContributors = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
): DashboardFeaturedContributor[] => {
  const seen = new Set<string>();
  const contributors: DashboardFeaturedContributor[] = [];
  const pickers: Array<() => DashboardFeaturedContributor | undefined> = [
    () => pickTopOssContributor(prs, miners, seen),
    () => pickMostMergedPrMiner(prs, miners, seen),
    () => getHighestScoringMergedAuthor(prs, miners, seen),
    () => pickHighestTokenScoreMiner(prs, miners, seen),
  ];
  for (const pick of pickers) {
    const c = pick();
    if (c) {
      seen.add(c.githubId);
      contributors.push(c);
    }
  }
  return contributors;
};

const mapPrStatusTone = (
  statusLabel: ReturnType<typeof getPrStatusLabel>,
): FeaturedWorkStatusTone => {
  if (statusLabel === 'Merged') return 'merged';
  if (statusLabel === 'Closed') return 'closed';
  return 'open';
};

const FEATURED_WORK_CONFIG: FeaturedWorkConfig = {
  repoCount: 3,
  prsPerRepo: 4,
  windowHours: 24,
  windowLabel: '24h',
} as const;

interface RepoAccumulator {
  prs: CommitLog[];
  totalScore: number;
}

type InactiveRepoSet = Set<string>;

const buildInactiveRepoSet = (repos: Repository[]): InactiveRepoSet =>
  new Set(
    repos
      .filter((r: Repository): boolean => !!r.inactiveAt)
      .map((r: Repository): string => r.fullName.toLowerCase()),
  );

const isMergedInWindow = (
  pr: CommitLog,
  cutoff: number,
  inactiveRepos: InactiveRepoSet,
): boolean => {
  const merged: number | null = toTimestamp(pr.mergedAt);
  return (
    merged !== null &&
    merged >= cutoff &&
    getPrStatusLabel(pr) === 'Merged' &&
    Boolean(pr.repository) &&
    !inactiveRepos.has(pr.repository.toLowerCase())
  );
};

const groupPrsByRepo = (
  windowPrs: CommitLog[],
): Map<string, RepoAccumulator> => {
  const repoMap = new Map<string, RepoAccumulator>();
  for (const pr of windowPrs) {
    const key: string = pr.repository.toLowerCase();
    const entry: RepoAccumulator = repoMap.get(key) ?? {
      prs: [],
      totalScore: 0,
    };
    entry.prs.push(pr);
    entry.totalScore += parseNumber(pr.score);
    repoMap.set(key, entry);
  }
  return repoMap;
};

const sortReposByActivity = (
  entries: Array<[string, RepoAccumulator]>,
): Array<[string, RepoAccumulator]> =>
  entries.sort(
    ([, a]: [string, RepoAccumulator], [, b]: [string, RepoAccumulator]) =>
      b.totalScore - a.totalScore || b.prs.length - a.prs.length,
  );

const mapCommitLogToFeaturedPr = (pr: CommitLog): FeaturedWorkPr => {
  const statusLabel: ReturnType<typeof getPrStatusLabel> = getPrStatusLabel(pr);
  const statusTone: FeaturedWorkStatusTone = mapPrStatusTone(statusLabel);
  return {
    prNumber: pr.pullRequestNumber,
    title: pr.pullRequestTitle || `PR #${pr.pullRequestNumber}`,
    score: parseNumber(pr.score),
    author: pr.author || 'unknown',
    mergedAt: pr.mergedAt ?? null,
    additions: parseNumber(pr.additions),
    deletions: parseNumber(pr.deletions),
    statusLabel,
    statusTone,
  };
};

const buildRepoEntry = (
  repoPrs: CommitLog[],
  totalScore: number,
  config: FeaturedWorkConfig,
): FeaturedWorkRepo => {
  const sorted: CommitLog[] = [...repoPrs].sort(
    (a: CommitLog, b: CommitLog) => parseNumber(b.score) - parseNumber(a.score),
  );
  const canonical: string = sorted[0].repository;
  const topPrs: FeaturedWorkPr[] = sorted
    .slice(0, config.prsPerRepo)
    .map(mapCommitLogToFeaturedPr);
  return {
    repository: canonical,
    prCount: repoPrs.length,
    totalScore,
    windowLabel: config.windowLabel,
    prs: topPrs,
  };
};

export const buildFeaturedWork = (
  prs: CommitLog[],
  repos: Repository[],
): FeaturedWorkRepo[] => {
  const config: FeaturedWorkConfig = FEATURED_WORK_CONFIG;
  const now: number = Date.now();
  const cutoff: number = now - config.windowHours * DASHBOARD_HOUR_MS;

  const inactiveRepos: InactiveRepoSet = buildInactiveRepoSet(repos);

  const windowPrs: CommitLog[] = prs.filter((pr: CommitLog): boolean =>
    isMergedInWindow(pr, cutoff, inactiveRepos),
  );

  const repoMap: Map<string, RepoAccumulator> = groupPrsByRepo(windowPrs);

  const rankedEntries: Array<[string, RepoAccumulator]> = sortReposByActivity(
    Array.from(repoMap.entries()),
  );

  return rankedEntries
    .slice(0, config.repoCount)
    .map(
      ([, { prs: repoPrs, totalScore }]: [
        string,
        RepoAccumulator,
      ]): FeaturedWorkRepo => buildRepoEntry(repoPrs, totalScore, config),
    );
};
