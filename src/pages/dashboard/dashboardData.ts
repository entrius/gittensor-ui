/**
 * Pure dashboard data builders.
 *
 * This module converts raw PR, issue, and miner datasets into UI-facing models
 * for trends, overview sections, KPIs, and featured contributors.
 *
 * Most dashboard sections are driven by the caller-provided time range.
 * Featured contributors intentionally use a fixed 35-day lookback window.
 */
import { type CommitLog, type MinerEvaluation } from '../../api';
import { type IssueBounty } from '../../api/models/Issues';
import { getPrStatusLabel, parseNumber } from '../../utils';

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

export interface DashboardOverviewSection {
  title: string;
  metrics: DashboardOverviewMetric[];
  chartSegments: Array<{
    label: string;
    value: number;
  }>;
  chartCenterLabel: string;
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
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const GITTENSOR_START_MS = Date.UTC(2025, 11, 1, 0, 0, 0);

const RANGE_CONFIG: Record<
  PresetTimeRange,
  { windowMs: number; bucketMs: number; points: number }
> = {
  '1d': { windowMs: DAY_MS, bucketMs: 3 * HOUR_MS, points: 8 },
  '7d': { windowMs: 7 * DAY_MS, bucketMs: DAY_MS, points: 7 },
  '35d': { windowMs: 35 * DAY_MS, bucketMs: DAY_MS, points: 35 },
};

const TREND_SERIES_KEYS: TrendSeriesKey[] = [
  'mergedPrs',
  'issuesResolved',
  'prsOpened',
  'issuesOpened',
];
const CURRENT_LOOKBACK_WINDOW: PresetTimeRange = '35d';

type WindowBounds = {
  startMs: number;
  endMs: number;
};

const toTimestamp = (value?: string | null): number | null => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const isWithinWindow = (timestamp: number | null, window: WindowBounds) =>
  timestamp !== null && timestamp >= window.startMs && timestamp < window.endMs;

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

  if (range === 'all') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
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
  const endExclusive = currentWeekStart + WEEK_MS;
  const buckets: Array<{ startMs: number; endMs: number; label: string }> = [];

  for (
    let bucketStart = firstWeekStart;
    bucketStart < endExclusive;
    bucketStart += WEEK_MS
  ) {
    buckets.push({
      startMs: bucketStart,
      endMs: bucketStart + WEEK_MS,
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

  return {
    labels: buckets.map((bucket) => bucket.label),
    series: TREND_SERIES_KEYS.map((key) => ({
      key,
      values:
        key === 'mergedPrs'
          ? mergedPrValues
          : key === 'prsOpened'
            ? openedPrValues
            : key === 'issuesResolved'
              ? resolvedIssueValues
              : openedIssueValues,
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

  const currentPrMetrics = getPrOverviewMetrics(prs, currentWindow);
  const previousPrMetrics = previousWindow
    ? getPrOverviewMetrics(prs, previousWindow)
    : null;
  const currentIssueMetrics = getIssueOverviewMetricsFromMiners(miners);
  const getMetricDelta = (currentValue: number, previousValue?: number) =>
    range === 'all' || previousValue === undefined
      ? '0%'
      : formatDelta(currentValue, previousValue);

  return [
    {
      title: 'OSS Contributions',
      chartSegments: [
        { label: 'Merged', value: currentPrMetrics.merged },
        { label: 'Open', value: currentPrMetrics.open },
        { label: 'Closed', value: currentPrMetrics.closed },
      ],
      chartCenterLabel: formatCenterPercent(
        currentPrMetrics.merged,
        currentPrMetrics.merged + currentPrMetrics.closed,
      ),
      metrics: [
        {
          label: 'Total',
          value: currentPrMetrics.total,
          delta: getMetricDelta(
            currentPrMetrics.total,
            previousPrMetrics?.total,
          ),
        },
        {
          label: 'Merged',
          value: currentPrMetrics.merged,
          delta: getMetricDelta(
            currentPrMetrics.merged,
            previousPrMetrics?.merged,
          ),
        },
        {
          label: 'Open',
          value: currentPrMetrics.open,
          delta: getMetricDelta(currentPrMetrics.open, previousPrMetrics?.open),
        },
        {
          label: 'Closed',
          value: currentPrMetrics.closed,
          delta: getMetricDelta(
            currentPrMetrics.closed,
            previousPrMetrics?.closed,
          ),
        },
      ],
    },
    {
      title: 'Issue Discoveries',
      chartSegments: [
        { label: 'Solved', value: currentIssueMetrics.solved },
        { label: 'Open', value: currentIssueMetrics.open },
        { label: 'Closed', value: currentIssueMetrics.closed },
      ],
      chartCenterLabel: formatCenterPercent(
        currentIssueMetrics.solved,
        currentIssueMetrics.solved + currentIssueMetrics.closed,
      ),
      // Issue metrics come from per-miner aggregates (all-time totals), so
      // there is no previous-window comparison available — deltas are '0%'.
      metrics: [
        {
          label: 'Total',
          value: currentIssueMetrics.total,
          delta: '0%',
        },
        {
          label: 'Solved',
          value: currentIssueMetrics.solved,
          delta: '0%',
        },
        {
          label: 'Open',
          value: currentIssueMetrics.open,
          delta: '0%',
        },
        {
          label: 'Closed',
          value: currentIssueMetrics.closed,
          delta: '0%',
        },
      ],
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
    if (
      pr.githubId !== githubId ||
      !pr.repository ||
      !isWithinWindow(toTimestamp(pr.mergedAt), currentWindow)
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
    existing.lastMergedAt = Math.max(
      existing.lastMergedAt,
      toTimestamp(pr.mergedAt) ?? 0,
    );

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

const getHighestScoringMergedAuthor = (
  prs: CommitLog[],
): DashboardFeaturedContributor | undefined => {
  const currentWindow = getWindowBounds(CURRENT_LOOKBACK_WINDOW);

  const topPr = [...prs]
    .filter(
      (pr) =>
        !!pr.githubId &&
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

  return {
    githubId: topPr.githubId,
    githubUsername: topPr.author || undefined,
    featuredLabel: 'Highest-Scoring PR Author',
    name: topPr.author ?? topPr.githubId,
    metrics: [
      {
        value: Math.round(parseNumber(topPr.score)).toLocaleString(),
        unit: 'Score',
      },
    ],
    repos: topPr.repository ? [topPr.repository] : [],
  };
};

const pickTopOssContributor = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
): DashboardFeaturedContributor | undefined => {
  const topOssMiner = [...miners]
    .sort((a, b) => {
      const scoreDiff = parseNumber(b.totalScore) - parseNumber(a.totalScore);
      if (scoreDiff !== 0) return scoreDiff;

      const mergedPrDiff = (b.totalMergedPrs ?? 0) - (a.totalMergedPrs ?? 0);
      if (mergedPrDiff !== 0) return mergedPrDiff;

      return a.id - b.id;
    })
    .find((miner) => parseNumber(miner.totalScore) > 0);

  if (!topOssMiner) return undefined;

  return {
    featuredLabel: 'Top OSS Miner',
    githubId: topOssMiner.githubId,
    githubUsername: topOssMiner.githubUsername,
    name: topOssMiner.githubUsername ?? topOssMiner.githubId,
    metrics: [
      {
        value: Math.round(parseNumber(topOssMiner.totalScore)).toLocaleString(),
        unit: 'Score',
      },
      ...(parseNumber(topOssMiner.credibility) > 0
        ? [
            {
              value: `${Math.round(parseNumber(topOssMiner.credibility) * 100)}%`,
              unit: 'Cred.',
            },
          ]
        : []),
    ],
    repos: getTopContributorRepos(prs, topOssMiner.githubId),
  };
};

const pickMostMergedPrMiner = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
): DashboardFeaturedContributor | undefined => {
  const mostMergedPrMiner = [...miners].sort((a, b) => {
    const diff = (b.totalMergedPrs ?? 0) - (a.totalMergedPrs ?? 0);
    if (diff !== 0) return diff;
    return b.totalScore - a.totalScore;
  })[0];

  if (!mostMergedPrMiner) return undefined;

  return {
    featuredLabel: 'Most Merged PRs',
    githubId: mostMergedPrMiner.githubId,
    githubUsername: mostMergedPrMiner.githubUsername,
    name: mostMergedPrMiner.githubUsername ?? mostMergedPrMiner.githubId,
    metrics: [
      {
        value: `${mostMergedPrMiner.totalMergedPrs ?? 0}`,
        unit: 'Merged',
      },
      ...(parseNumber(mostMergedPrMiner.credibility) > 0
        ? [
            {
              value: `${Math.round(parseNumber(mostMergedPrMiner.credibility) * 100)}%`,
              unit: 'Cred.',
            },
          ]
        : []),
    ],
    repos: getTopContributorRepos(prs, mostMergedPrMiner.githubId),
  };
};

export const buildFeaturedContributors = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
): DashboardFeaturedContributor[] => {
  const highestScoringMergedAuthor = getHighestScoringMergedAuthor(prs);
  const topOssMiner = pickTopOssContributor(prs, miners);
  const mostMergedPrMiner = pickMostMergedPrMiner(prs, miners);
  const contributors: DashboardFeaturedContributor[] = [];

  if (topOssMiner) contributors.push(topOssMiner);
  if (mostMergedPrMiner) contributors.push(mostMergedPrMiner);
  if (highestScoringMergedAuthor) contributors.push(highestScoringMergedAuthor);

  return contributors;
};

const pickTopDiscoveryMiner = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
): DashboardFeaturedContributor | undefined => {
  const top = [...miners]
    .filter((m) => m.isIssueEligible && parseNumber(m.issueDiscoveryScore) > 0)
    .sort((a, b) => {
      const diff =
        parseNumber(b.issueDiscoveryScore) - parseNumber(a.issueDiscoveryScore);
      return diff !== 0 ? diff : a.id - b.id;
    })[0];

  if (!top) return undefined;

  return {
    featuredLabel: 'Top Discovery Miner',
    githubId: top.githubId,
    githubUsername: top.githubUsername,
    name: top.githubUsername ?? top.githubId,
    metrics: [
      {
        value: Math.round(
          parseNumber(top.issueDiscoveryScore),
        ).toLocaleString(),
        unit: 'Score',
      },
      ...(parseNumber(top.issueCredibility) > 0
        ? [
            {
              value: `${Math.round(parseNumber(top.issueCredibility) * 100)}%`,
              unit: 'Cred.',
            },
          ]
        : []),
    ],
    repos: getTopContributorRepos(prs, top.githubId),
  };
};

const pickMostSolvedIssuesMiner = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
): DashboardFeaturedContributor | undefined => {
  const top = [...miners]
    .filter((m) => m.isIssueEligible && (m.totalValidSolvedIssues ?? 0) > 0)
    .sort((a, b) => {
      const diff =
        (b.totalValidSolvedIssues ?? 0) - (a.totalValidSolvedIssues ?? 0);
      if (diff !== 0) return diff;
      return (
        parseNumber(b.issueDiscoveryScore) - parseNumber(a.issueDiscoveryScore)
      );
    })[0];

  if (!top) return undefined;

  return {
    featuredLabel: 'Most Solved Issues',
    githubId: top.githubId,
    githubUsername: top.githubUsername,
    name: top.githubUsername ?? top.githubId,
    metrics: [
      {
        value: `${top.totalValidSolvedIssues ?? 0}`,
        unit: 'Solved',
      },
      ...(parseNumber(top.issueCredibility) > 0
        ? [
            {
              value: `${Math.round(parseNumber(top.issueCredibility) * 100)}%`,
              unit: 'Cred.',
            },
          ]
        : []),
    ],
    repos: getTopContributorRepos(prs, top.githubId),
  };
};

const pickHighestIssueTokenScoreMiner = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
): DashboardFeaturedContributor | undefined => {
  const top = [...miners]
    .filter((m) => m.isIssueEligible && parseNumber(m.issueTokenScore) > 0)
    .sort((a, b) => {
      const diff =
        parseNumber(b.issueTokenScore) - parseNumber(a.issueTokenScore);
      return diff !== 0 ? diff : a.id - b.id;
    })[0];

  if (!top) return undefined;

  return {
    featuredLabel: 'Highest-Scoring Issue Author',
    githubId: top.githubId,
    githubUsername: top.githubUsername,
    name: top.githubUsername ?? top.githubId,
    metrics: [
      {
        value: Math.round(parseNumber(top.issueTokenScore)).toLocaleString(),
        unit: 'Score',
      },
    ],
    repos: getTopContributorRepos(prs, top.githubId),
  };
};

export const buildFeaturedDiscoveryContributors = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
): DashboardFeaturedContributor[] => {
  const topDiscoveryMiner = pickTopDiscoveryMiner(prs, miners);
  const mostSolvedIssuesMiner = pickMostSolvedIssuesMiner(prs, miners);
  const highestIssueTokenScoreMiner = pickHighestIssueTokenScoreMiner(
    prs,
    miners,
  );
  const contributors: DashboardFeaturedContributor[] = [];

  if (topDiscoveryMiner) contributors.push(topDiscoveryMiner);
  if (mostSolvedIssuesMiner) contributors.push(mostSolvedIssuesMiner);
  if (highestIssueTokenScoreMiner)
    contributors.push(highestIssueTokenScoreMiner);

  return contributors;
};
