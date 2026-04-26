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
import { formatTokenAmount } from '../../utils/format';

export type PresetTimeRange = '1d' | '7d' | '35d';
export type TrendTimeRange = PresetTimeRange | 'all';
export type TrendSeriesKey = 'mergedPrs' | 'issuesResolved' | 'prsOpened';

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
}

export type DashboardFeaturedWorkKind = 'pr' | 'issue';

export interface DashboardFeaturedWork {
  id: string;
  kind: DashboardFeaturedWorkKind;
  prNumber?: number;
  issueId?: number;
  githubNumber: number;
  featuredLabel: string;
  repository: string;
  title: string;
  score: number;
  statusLabel: string;
  statusTone: 'merged' | 'open' | 'closed';
  authorLabel: string;
  githubUsername?: string;
  openedAt: string | null;
  additions: number;
  deletions: number;
  metrics: Array<{
    label: string;
    value: string;
    tone?: 'positive' | 'negative' | 'neutral';
  }>;
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

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
};

const buildTrendBuckets = (
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
  const resolvedIssueTimestamps = issues
    .filter((issue) => issue.status === 'completed')
    .map((issue) => toTimestamp(issue.completedAt));
  const buckets = buildTrendBuckets(range, now);
  const mergedPrValues = bucketTimestamps(mergedPrTimestamps, buckets);
  const openedPrValues = bucketTimestamps(openedPrTimestamps, buckets);
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
      values:
        key === 'mergedPrs'
          ? mergedPrValues
          : key === 'prsOpened'
            ? openedPrValues
            : resolvedIssueValues,
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
      title: 'Bounties Completed',
      value: totalIssuesSolved,
      subtitle: 'Bounty issues fully paid out',
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
      ...optionalCredibilityMetrics(topOssMiner.credibility),
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
      ...optionalCredibilityMetrics(mostMergedPrMiner.credibility),
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

const mapPrStatusTone = (
  statusLabel: ReturnType<typeof getPrStatusLabel>,
): 'merged' | 'open' | 'closed' => {
  if (statusLabel === 'Merged') return 'merged';
  if (statusLabel === 'Closed') return 'closed';
  return 'open';
};

const mapIssueStatusTone = (
  status: IssueBounty['status'],
): 'merged' | 'open' | 'closed' => {
  if (status === 'completed') return 'merged';
  if (status === 'cancelled') return 'closed';
  return 'open';
};

const getIssueStatusLabel = (status: IssueBounty['status']) => {
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Closed';
  return 'Open';
};

const getIssueDisplayAmount = (issue: IssueBounty): number => {
  const target = parseNumber(issue.targetBounty);
  const current = parseNumber(issue.bountyAmount);
  return target > 0 ? target : current;
};

export const buildFeaturedWork = (
  prs: CommitLog[],
  issues: IssueBounty[],
): DashboardFeaturedWork[] => {
  const currentWindow = getWindowBounds(CURRENT_LOOKBACK_WINDOW);
  const selectedRepos = new Set<string>();
  const selectedOrgs = new Set<string>();
  const selectedAuthors = new Set<string>();

  const isCandidateAllowed = (
    repository: string,
    authorLabel: string,
    allowOrgAuthorDuplicates = false,
  ) => {
    const normalizedRepo = repository.toLowerCase();
    const org = (repository.split('/')[0] || '').toLowerCase();
    const author = (authorLabel || 'unknown').toLowerCase();
    if (!normalizedRepo || !org) return false;
    if (selectedRepos.has(normalizedRepo)) return false;
    if (allowOrgAuthorDuplicates) return true;
    return !selectedOrgs.has(org) && !selectedAuthors.has(author);
  };

  const markAsSelected = (repository: string, authorLabel: string) => {
    selectedRepos.add(repository.toLowerCase());
    selectedOrgs.add((repository.split('/')[0] || '').toLowerCase());
    selectedAuthors.add((authorLabel || 'unknown').toLowerCase());
  };

  const pickFirstDiverse = <T>(
    sortedLists: T[][],
    getRepository: (item: T) => string,
    getAuthor: (item: T) => string,
  ): T | undefined => {
    for (const list of sortedLists) {
      const found =
        list.find((item) =>
          isCandidateAllowed(getRepository(item), getAuthor(item)),
        ) ??
        list.find((item) =>
          isCandidateAllowed(getRepository(item), getAuthor(item), true),
        );
      if (found) return found;
    }
    return undefined;
  };

  const mergedPrs = [...prs].filter(
    (pr) =>
      getPrStatusLabel(pr) === 'Merged' &&
      isWithinWindow(toTimestamp(pr.mergedAt ?? pr.prCreatedAt), currentWindow),
  );
  const allWindowPrs = [...prs].filter((pr) =>
    isWithinWindow(toTimestamp(pr.prCreatedAt), currentWindow),
  );

  const toPrCard = (
    pr: CommitLog,
    featuredLabel: string,
  ): DashboardFeaturedWork => {
    const score = parseNumber(pr.score);
    const additions = parseNumber(pr.additions);
    const deletions = parseNumber(pr.deletions);
    const commits = parseNumber(pr.commitCount);
    const baseMetrics: DashboardFeaturedWork['metrics'] = [
      { label: 'Score', value: score.toFixed(2) },
      {
        label: 'Changes',
        value: `+${additions.toLocaleString()} / -${deletions.toLocaleString()}`,
        tone: 'positive',
      },
      { label: 'Commits', value: commits.toLocaleString() },
    ];
    if (featuredLabel === 'Largest PR') {
      baseMetrics[0] = {
        label: 'Additions',
        value: `+${additions.toLocaleString()}`,
        tone: 'positive',
      };
      baseMetrics[1] = {
        label: 'Deletions',
        value: `-${deletions.toLocaleString()}`,
        tone: 'negative',
      };
      baseMetrics[2] = {
        label: 'Net Changes',
        value: `+${(additions - deletions).toLocaleString()}`,
        tone: 'positive',
      };
    } else if (featuredLabel === 'Most Commits PR') {
      baseMetrics[0] = { label: 'Commits', value: commits.toLocaleString() };
      baseMetrics[2] = { label: 'Score', value: score.toFixed(2) };
    } else if (featuredLabel === 'Newest Merged PR') {
      const mergedAt = toTimestamp(pr.mergedAt);
      const ageDays =
        mergedAt === null
          ? null
          : Math.max(0, Math.floor((currentWindow.endMs - mergedAt) / DAY_MS));
      baseMetrics[0] = {
        label: 'Merged',
        value:
          ageDays === null
            ? '-'
            : `${ageDays} day${ageDays === 1 ? '' : 's'} ago`,
      };
      baseMetrics[2] = { label: 'Score', value: score.toFixed(2) };
    }

    const statusLabel = getPrStatusLabel(pr);

    return {
      id: `pr-${featuredLabel}-${pr.repository}-${pr.pullRequestNumber}`,
      kind: 'pr',
      prNumber: pr.pullRequestNumber,
      githubNumber: pr.pullRequestNumber,
      featuredLabel,
      repository: pr.repository,
      title: pr.pullRequestTitle || `PR #${pr.pullRequestNumber}`,
      score,
      statusLabel,
      statusTone: mapPrStatusTone(statusLabel),
      authorLabel: pr.author || 'unknown',
      githubUsername: pr.author || undefined,
      openedAt: pr.mergedAt ?? pr.prCreatedAt ?? null,
      additions,
      deletions,
      metrics: baseMetrics,
    };
  };

  const pickPr = (
    featuredLabel: string,
    sortFn: (a: CommitLog, b: CommitLog) => number,
  ) => {
    const mergedSorted = [...mergedPrs].sort(sortFn);
    const allSorted = [...allWindowPrs].sort(sortFn);
    const candidate =
      pickFirstDiverse(
        [mergedSorted, allSorted],
        (pr) => pr.repository,
        (pr) => pr.author || 'unknown',
      ) ??
      mergedSorted.find((pr) => Boolean(pr.repository)) ??
      allSorted.find((pr) => Boolean(pr.repository));
    if (!candidate) return undefined;
    markAsSelected(candidate.repository, candidate.author || 'unknown');
    return toPrCard(candidate, featuredLabel);
  };

  const rankedHighestBountyIssues = [...issues]
    .filter((issue) =>
      isWithinWindow(
        toTimestamp(issue.completedAt ?? issue.createdAt),
        currentWindow,
      ),
    )
    .sort((a, b) => {
      const bountyDiff = getIssueDisplayAmount(b) - getIssueDisplayAmount(a);
      if (bountyDiff !== 0) return bountyDiff;
      return (
        (toTimestamp(b.completedAt ?? b.createdAt) ?? 0) -
        (toTimestamp(a.completedAt ?? a.createdAt) ?? 0)
      );
    });
  const rankedCompletedIssues = rankedHighestBountyIssues.filter(
    (issue) => issue.status === 'completed',
  );

  const fallbackIssuePool = [...issues].sort(
    (a, b) => getIssueDisplayAmount(b) - getIssueDisplayAmount(a),
  );

  const toIssueCard = (
    issue: IssueBounty,
    featuredLabel: string,
  ): DashboardFeaturedWork => {
    const payoutAmount = getIssueDisplayAmount(issue);
    const author = issue.authorLogin || 'open bounty';
    const statusLabel = getIssueStatusLabel(issue.status);
    return {
      id: `issue-${featuredLabel}-${issue.id}`,
      kind: 'issue',
      issueId: issue.id,
      githubNumber: issue.issueNumber,
      featuredLabel,
      repository: issue.repositoryFullName,
      title: issue.title || `Issue #${issue.issueNumber}`,
      score: payoutAmount,
      statusLabel,
      statusTone: mapIssueStatusTone(issue.status),
      authorLabel: author,
      githubUsername: issue.authorLogin || undefined,
      openedAt: issue.completedAt ?? issue.closedAt ?? issue.createdAt ?? null,
      additions: payoutAmount,
      deletions: 0,
      metrics: [
        { label: 'Payout', value: `${formatTokenAmount(payoutAmount, 2)} ل` },
        { label: 'Issue #', value: `#${issue.issueNumber}` },
      ],
    };
  };

  const pickIssue = (featuredLabel: string, pool: IssueBounty[]) => {
    const candidate =
      pickFirstDiverse(
        [pool, fallbackIssuePool],
        (issue) => issue.repositoryFullName,
        (issue) => issue.authorLogin || 'open bounty',
      ) ??
      pool[0] ??
      fallbackIssuePool[0];
    if (!candidate) return undefined;
    markAsSelected(
      candidate.repositoryFullName,
      candidate.authorLogin || 'open bounty',
    );
    return toIssueCard(candidate, featuredLabel);
  };

  const picks: Array<DashboardFeaturedWork | undefined> = [
    pickPr('Top PR by Score', (a, b) => {
      const scoreDiff = parseNumber(b.score) - parseNumber(a.score);
      if (scoreDiff !== 0) return scoreDiff;
      return (toTimestamp(b.mergedAt) ?? 0) - (toTimestamp(a.mergedAt) ?? 0);
    }),
    pickPr('Largest PR', (a, b) => {
      const aChanges = parseNumber(a.additions) + parseNumber(a.deletions);
      const bChanges = parseNumber(b.additions) + parseNumber(b.deletions);
      if (bChanges !== aChanges) return bChanges - aChanges;
      return parseNumber(b.score) - parseNumber(a.score);
    }),
    pickPr('Most Commits PR', (a, b) => {
      const commitDiff =
        parseNumber(b.commitCount) - parseNumber(a.commitCount);
      if (commitDiff !== 0) return commitDiff;
      return parseNumber(b.score) - parseNumber(a.score);
    }),
    pickPr('Newest Merged PR', (a, b) => {
      const dateDiff =
        (toTimestamp(b.mergedAt) ?? 0) - (toTimestamp(a.mergedAt) ?? 0);
      if (dateDiff !== 0) return dateDiff;
      return parseNumber(b.score) - parseNumber(a.score);
    }),
    pickIssue('Top Completed Issue', rankedCompletedIssues),
    pickIssue('Highest Bounty Issue', rankedHighestBountyIssues),
  ];

  return picks.filter((entry): entry is DashboardFeaturedWork =>
    Boolean(entry),
  );
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
      ...optionalCredibilityMetrics(top.issueCredibility),
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
      ...optionalCredibilityMetrics(top.issueCredibility),
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
