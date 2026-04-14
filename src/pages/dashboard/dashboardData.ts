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
import {
  getIssueStatusLabel,
  getPrStatusLabel,
  parseNumber,
} from '../../utils';

export type PresetTimeRange = '1d' | '7d' | '35d';
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
  chartTotal: string;
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
  range: PresetTimeRange,
  now = new Date(),
): WindowBounds => {
  const { windowMs } = getRangeConfig(range);
  const endMs = now.getTime();
  return { startMs: endMs - windowMs, endMs };
};

export const getPreviousWindowBounds = (
  range: PresetTimeRange,
  now = new Date(),
): WindowBounds => {
  const current = getWindowBounds(range, now);
  const { windowMs } = getRangeConfig(range);
  return {
    startMs: current.startMs - windowMs,
    endMs: current.startMs,
  };
};

const bucketTimestamps = (
  timestamps: Array<number | null>,
  range: PresetTimeRange,
  now = new Date(),
) => {
  const { points, bucketMs } = getRangeConfig(range);
  const current = getWindowBounds(range, now);
  const values = Array.from({ length: points }, () => 0);

  timestamps.forEach((timestamp) => {
    if (timestamp === null || !isWithinWindow(timestamp, current)) return;

    const index = Math.min(
      Math.floor((timestamp - current.startMs) / bucketMs),
      points - 1,
    );
    if (index >= 0) {
      values[index] += 1;
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
  range: PresetTimeRange,
  now = new Date(),
): DashboardTrendSeries[] => {
  const mergedPrValues = bucketTimestamps(
    prs.map((pr) => toTimestamp(pr.mergedAt)),
    range,
    now,
  );
  const openedPrValues = bucketTimestamps(
    prs.map((pr) => toTimestamp(pr.prCreatedAt)),
    range,
    now,
  );
  const openedIssueValues = bucketTimestamps(
    issues.map((issue) => toTimestamp(issue.createdAt)),
    range,
    now,
  );
  const resolvedIssueValues = bucketTimestamps(
    issues
      .filter((issue) => issue.status === 'completed')
      .map((issue) => toTimestamp(issue.completedAt)),
    range,
    now,
  );

  return TREND_SERIES_KEYS.map((key) => ({
    key,
    values:
      key === 'mergedPrs'
        ? mergedPrValues
        : key === 'prsOpened'
          ? openedPrValues
          : key === 'issuesResolved'
            ? resolvedIssueValues
            : openedIssueValues,
  }));
};

const getPrOverviewMetrics = (prs: CommitLog[], window: WindowBounds) => {
  const statusCounts = {
    total: 0,
    merged: 0,
    open: 0,
    closed: 0,
    uniqueRepositories: new Set<string>(),
  };

  prs.forEach((pr) => {
    const normalizedState = getPrStatusLabel(pr);
    const createdInWindow = isWithinWindow(toTimestamp(pr.prCreatedAt), window);
    const mergedInWindow = isWithinWindow(toTimestamp(pr.mergedAt), window);
    const closedInWindow = isWithinWindow(toTimestamp(pr.closedAt), window);

    let shouldCount = false;

    if (normalizedState === 'Merged' && mergedInWindow) {
      statusCounts.merged += 1;
      shouldCount = true;
    } else if (normalizedState === 'Open' && createdInWindow) {
      statusCounts.open += 1;
      shouldCount = true;
    } else if (normalizedState === 'Closed' && closedInWindow) {
      statusCounts.closed += 1;
      shouldCount = true;
    }

    if (!shouldCount) return;

    statusCounts.total += 1;

    if (pr.repository) {
      statusCounts.uniqueRepositories.add(pr.repository);
    }
  });

  return {
    total: statusCounts.total,
    merged: statusCounts.merged,
    open: statusCounts.open,
    closed: statusCounts.closed,
    uniqueRepositories: statusCounts.uniqueRepositories.size,
  };
};

const getIssueOverviewMetrics = (
  issues: IssueBounty[],
  window: WindowBounds,
) => {
  const statusCounts = {
    total: 0,
    solved: 0,
    open: 0,
    closed: 0,
    uniqueRepositories: new Set<string>(),
  };

  issues.forEach((issue) => {
    const normalizedStatus = getIssueStatusLabel(issue);
    const createdInWindow = isWithinWindow(
      toTimestamp(issue.createdAt),
      window,
    );
    const solvedInWindow = isWithinWindow(
      toTimestamp(issue.completedAt),
      window,
    );
    const closedInWindow = isWithinWindow(toTimestamp(issue.closedAt), window);

    let shouldCount = false;

    if (normalizedStatus === 'Solved' && solvedInWindow) {
      statusCounts.solved += 1;
      shouldCount = true;
    } else if (normalizedStatus === 'Open' && createdInWindow) {
      statusCounts.open += 1;
      shouldCount = true;
    } else if (normalizedStatus === 'Closed' && closedInWindow) {
      statusCounts.closed += 1;
      shouldCount = true;
    }

    if (!shouldCount) return;

    statusCounts.total += 1;

    if (issue.repositoryFullName) {
      statusCounts.uniqueRepositories.add(issue.repositoryFullName);
    }
  });

  return {
    total: statusCounts.total,
    solved: statusCounts.solved,
    open: statusCounts.open,
    closed: statusCounts.closed,
    uniqueRepositories: statusCounts.uniqueRepositories.size,
  };
};

export const buildDashboardOverview = (
  prs: CommitLog[],
  issues: IssueBounty[],
  range: PresetTimeRange,
  now = new Date(),
): DashboardOverviewSection[] => {
  const currentWindow = getWindowBounds(range, now);
  const previousWindow = getPreviousWindowBounds(range, now);

  const currentPrMetrics = getPrOverviewMetrics(prs, currentWindow);
  const previousPrMetrics = getPrOverviewMetrics(prs, previousWindow);
  const currentIssueMetrics = getIssueOverviewMetrics(issues, currentWindow);
  const previousIssueMetrics = getIssueOverviewMetrics(issues, previousWindow);

  return [
    {
      title: 'OSS Contributions',
      chartSegments: [
        { label: 'Merged', value: currentPrMetrics.merged },
        { label: 'Open', value: currentPrMetrics.open },
        { label: 'Closed', value: currentPrMetrics.closed },
      ],
      chartTotal: currentPrMetrics.total.toLocaleString(),
      metrics: [
        {
          label: 'Total',
          value: currentPrMetrics.total,
          delta: formatDelta(currentPrMetrics.total, previousPrMetrics.total),
        },
        {
          label: 'Merged',
          value: currentPrMetrics.merged,
          delta: formatDelta(currentPrMetrics.merged, previousPrMetrics.merged),
        },
        {
          label: 'Open',
          value: currentPrMetrics.open,
          delta: formatDelta(currentPrMetrics.open, previousPrMetrics.open),
        },
        {
          label: 'Closed',
          value: currentPrMetrics.closed,
          delta: formatDelta(currentPrMetrics.closed, previousPrMetrics.closed),
        },
        {
          label: 'Unique Repositories',
          value: currentPrMetrics.uniqueRepositories,
          delta: formatDelta(
            currentPrMetrics.uniqueRepositories,
            previousPrMetrics.uniqueRepositories,
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
      chartTotal: currentIssueMetrics.total.toLocaleString(),
      metrics: [
        {
          label: 'Total',
          value: currentIssueMetrics.total,
          delta: formatDelta(
            currentIssueMetrics.total,
            previousIssueMetrics.total,
          ),
        },
        {
          label: 'Solved',
          value: currentIssueMetrics.solved,
          delta: formatDelta(
            currentIssueMetrics.solved,
            previousIssueMetrics.solved,
          ),
        },
        {
          label: 'Open',
          value: currentIssueMetrics.open,
          delta: formatDelta(
            currentIssueMetrics.open,
            previousIssueMetrics.open,
          ),
        },
        {
          label: 'Closed',
          value: currentIssueMetrics.closed,
          delta: formatDelta(
            currentIssueMetrics.closed,
            previousIssueMetrics.closed,
          ),
        },
        {
          label: 'Unique Repositories',
          value: currentIssueMetrics.uniqueRepositories,
          delta: formatDelta(
            currentIssueMetrics.uniqueRepositories,
            previousIssueMetrics.uniqueRepositories,
          ),
        },
      ],
    },
  ];
};

export const buildDashboardKpis = (
  prs: CommitLog[],
  issues: IssueBounty[],
  range: PresetTimeRange,
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
