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
  type MirrorDashboardIssue,
} from '../../api';
import {
  getPrStatusLabel,
  isIssueDiscoveryContributionPr,
  parseNumber,
} from '../../utils';

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

export interface DashboardContributionHour {
  timestamp: string;
  date: string;
  hour: number;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface DashboardContributionCalendar {
  hours: DashboardContributionHour[];
  totalHoursShown: number;
  selectedMonth: string;
  availableMonths: string[];
  rangeCount: number;
  rangeLabel: string;
  rangeOverRangePercent: number | null;
  selectedMonthCount: number;
  selectedMonthLabel: string;
  previousMonthCount: number;
  previousMonthLabel: string;
  monthOverMonthPercent: number | null;
  thisWeekCount: number;
  weekOverWeekPercent: number | null;
  weekOverWeekLabel: string;
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
  /** Earnings in USD per day (displayed prominently like miner cards). */
  usdPerDay?: number;
  /** Credibility as 0-1 fraction (rendered as donut ring). */
  credibility?: number;
  /** Segments for the credibility donut (e.g. Merged/Open/Closed). */
  segments?: Array<{ label: string; value: number }>;
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

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
export const GITTENSOR_START_MS = Date.UTC(2025, 11, 1, 0, 0, 0);

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
/** Activity counted over this rolling window (inclusive, ending today). */
export const CONTRIBUTION_CALENDAR_DAYS = 365;
/** GitHub-style column count (Sun–Sat weeks). */
export const CONTRIBUTION_CALENDAR_WEEKS = 53;

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

const getRangeConfig = (range: PresetTimeRange) => RANGE_CONFIG[range];

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

const getPreviousWindowBounds = (
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

// A "truly resolved" issue: closed as completed AND the linked PR is merged.
// The conjunction matters — state_reason alone misses cases where GitHub
// doesn't set 'completed', and solving_pr.merged_at alone counts not-planned
// closures with stray PR links.
const isResolvedMinerIssue = (issue: MirrorDashboardIssue): boolean =>
  issue.state === 'CLOSED' &&
  issue.state_reason === 'COMPLETED' &&
  !!issue.solving_pr?.merged_at;

const isResolvedInWindow = (
  issue: MirrorDashboardIssue,
  window: WindowBounds,
): boolean =>
  isResolvedMinerIssue(issue) &&
  isWithinWindow(toTimestamp(issue.solving_pr?.merged_at), window);

// All-time buckets span a week, so the label carries the full range (and the
// year, since the all-time window crosses a year boundary). The chart's x-axis
// shows only the part before the dash; the tooltip shows the whole label.
const formatWeekRangeLabel = (startMs: number, endMs: number) => {
  const start = new Date(startMs);
  const end = new Date(endMs - 1);
  const monthDay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();
  const endLabel = sameMonth ? String(end.getDate()) : monthDay.format(end);
  return `${monthDay.format(start)} – ${endLabel}, ${end.getFullYear()}`;
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

  // Anchor weekly buckets to *now* (rather than calendar weeks) so the last
  // bucket always covers a full trailing 7 days. Calendar-aligned buckets end
  // on a partial current week, which renders as a fake cliff at the right edge
  // of every series.
  const endMs = now.getTime();
  const totalWeeks = Math.max(
    1,
    Math.ceil((endMs - GITTENSOR_START_MS) / WEEK_MS),
  );

  return Array.from({ length: totalWeeks }, (_, index) => {
    const bucketEnd = endMs - (totalWeeks - 1 - index) * WEEK_MS;
    return {
      startMs: bucketEnd - WEEK_MS,
      endMs: bucketEnd,
      label: formatWeekRangeLabel(bucketEnd - WEEK_MS, bucketEnd),
    };
  });
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
  issues: MirrorDashboardIssue[],
  range: TrendTimeRange,
  now = new Date(),
): { labels: string[]; series: DashboardTrendSeries[] } => {
  const mergedPrTimestamps = prs.map((pr) => toTimestamp(pr.mergedAt));
  const openedPrTimestamps = prs.map((pr) => toTimestamp(pr.prCreatedAt));
  const openedIssueTimestamps = issues.map((issue) =>
    toTimestamp(issue.created_at),
  );
  const resolvedIssueTimestamps = issues
    .filter(isResolvedMinerIssue)
    .map((issue) => toTimestamp(issue.solving_pr?.merged_at));
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

/** Local calendar date key (yyyy-MM-dd) — matches the user's system day boundaries. */
const formatCalendarDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDayStart = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const getLocalHourStart = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setMinutes(0, 0, 0);
  return date.getTime();
};

const addLocalDays = (dayStartMs: number, days: number) => {
  const date = new Date(dayStartMs);
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const addLocalHours = (hourStartMs: number, hours: number) => {
  const date = new Date(hourStartMs);
  date.setHours(date.getHours() + hours, 0, 0, 0);
  return date.getTime();
};

const parseCalendarDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return getLocalDayStart(new Date(year, month - 1, day).getTime());
};

const parseCalendarHourKey = (hourKey: string) => {
  const [dateKey, hourString] = hourKey.split('T');
  const [year, month, day] = dateKey.split('-').map(Number);
  return getLocalHourStart(
    new Date(year, month - 1, day, Number(hourString)).getTime(),
  );
};

const formatMonthKey = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatHourKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${formatCalendarDateKey(timestamp)}T${String(
    date.getHours(),
  ).padStart(2, '0')}`;
};

const parseMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, monthIndex: month - 1 };
};

const getContributionLevel = (
  count: number,
  nonZeroCounts: number[],
): 0 | 1 | 2 | 3 | 4 => {
  if (count <= 0) return 0;
  if (nonZeroCounts.length === 0) return 0;

  const lower = nonZeroCounts[Math.floor((nonZeroCounts.length - 1) * 0.25)];
  const middle = nonZeroCounts[Math.floor((nonZeroCounts.length - 1) * 0.5)];
  const upper = nonZeroCounts[Math.floor((nonZeroCounts.length - 1) * 0.75)];

  if (count <= lower) return 1;
  if (count <= middle) return 2;
  if (count <= upper) return 3;
  return 4;
};

const buildContributionCalendarDateRange = (
  selectedMonth: string,
  now = new Date(),
) => {
  const { year, monthIndex } = parseMonthKey(selectedMonth);
  const currentMonth = formatMonthKey(now.getTime());
  const startMs = getLocalHourStart(
    new Date(year, monthIndex - 3, 1).getTime(),
  );
  const endMs =
    selectedMonth === currentMonth
      ? getLocalHourStart(now.getTime())
      : getLocalHourStart(new Date(year, monthIndex + 1, 0, 23).getTime());
  return { startMs, endMs };
};

interface ContributionCalendarAggregation {
  prs: CommitLog[];
  issues: MirrorDashboardIssue[];
  currentMonth: string;
  availableMonths: string[];
  hourlyCounts: Map<string, number>;
}

let contributionCalendarAggregationCache: ContributionCalendarAggregation | null =
  null;
let contributionCalendarResultCache: {
  prs: CommitLog[];
  issues: MirrorDashboardIssue[];
  currentHour: string;
  values: Map<string, DashboardContributionCalendar>;
} | null = null;

const getContinuousContributionMonths = (months: Set<string>) => {
  const sortedMonths = Array.from(months).sort((a, b) => a.localeCompare(b));
  const firstMonth = sortedMonths[0];
  const lastMonth = sortedMonths[sortedMonths.length - 1];
  if (!firstMonth || !lastMonth) return [];

  const { year: startYear, monthIndex: startMonthIndex } =
    parseMonthKey(firstMonth);
  const { year: endYear, monthIndex: endMonthIndex } = parseMonthKey(lastMonth);
  const continuousMonths: string[] = [];
  const cursor = new Date(startYear, startMonthIndex, 1);
  const end = new Date(endYear, endMonthIndex, 1);

  while (cursor.getTime() <= end.getTime()) {
    continuousMonths.push(formatMonthKey(cursor.getTime()));
    cursor.setMonth(cursor.getMonth() + 1, 1);
  }

  return continuousMonths.sort((a, b) => b.localeCompare(a));
};

const getContributionCalendarAggregation = (
  prs: CommitLog[],
  issues: MirrorDashboardIssue[],
  now = new Date(),
): ContributionCalendarAggregation => {
  const currentMonth = formatMonthKey(now.getTime());
  const cached = contributionCalendarAggregationCache;

  if (
    cached &&
    cached.prs === prs &&
    cached.issues === issues &&
    cached.currentMonth === currentMonth
  ) {
    return cached;
  }

  const months = new Set<string>([currentMonth]);
  const hourlyCounts = new Map<string, number>();

  const incrementHour = (timestamp: number | null) => {
    if (timestamp === null) return;
    const hourMs = getLocalHourStart(timestamp);
    const hourKey = formatHourKey(hourMs);
    hourlyCounts.set(hourKey, (hourlyCounts.get(hourKey) ?? 0) + 1);
    months.add(formatMonthKey(timestamp));
  };

  prs.forEach((pr) => {
    incrementHour(toTimestamp(pr.mergedAt));
  });

  issues.forEach((issue) => {
    if (!isResolvedMinerIssue(issue)) return;
    incrementHour(toTimestamp(issue.solving_pr?.merged_at));
  });

  contributionCalendarAggregationCache = {
    prs,
    issues,
    currentMonth,
    availableMonths: getContinuousContributionMonths(months),
    hourlyCounts,
  };

  return contributionCalendarAggregationCache;
};

const getContributionRangeLabel = (range: TrendTimeRange) => {
  if (range === '1d') return 'last 1d';
  if (range === '7d') return 'last 7d';
  if (range === '35d') return 'last 35d';
  return 'all time';
};

const sumHourlyCountsInWindow = (
  hourlyCounts: Map<string, number>,
  window: WindowBounds,
) => {
  let total = 0;
  hourlyCounts.forEach((count, hourKey) => {
    if (isWithinWindow(parseCalendarHourKey(hourKey), window)) {
      total += count;
    }
  });
  return total;
};

const getMonthWindowBounds = (monthKey: string): WindowBounds => {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return {
    startMs: new Date(year, monthIndex, 1).getTime(),
    endMs: new Date(year, monthIndex + 1, 1).getTime(),
  };
};

const addMonthsToMonthKey = (monthKey: string, months: number) => {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return formatMonthKey(new Date(year, monthIndex + months, 1).getTime());
};

const getCompactMonthLabel = (monthKey: string) => {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};

export const buildDashboardContributionCalendar = (
  prs: CommitLog[],
  issues: MirrorDashboardIssue[],
  now = new Date(),
  selectedMonth = formatMonthKey(now.getTime()),
  range: TrendTimeRange = '7d',
): DashboardContributionCalendar => {
  const currentHour = formatHourKey(getLocalHourStart(now.getTime()));
  const { availableMonths, hourlyCounts } = getContributionCalendarAggregation(
    prs,
    issues,
    now,
  );
  const resolvedMonth = availableMonths.includes(selectedMonth)
    ? selectedMonth
    : (availableMonths[0] ?? formatMonthKey(now.getTime()));
  const cacheKey = `${resolvedMonth}|${range}`;
  const cached = contributionCalendarResultCache;

  if (
    cached &&
    cached.prs === prs &&
    cached.issues === issues &&
    cached.currentHour === currentHour
  ) {
    const cachedValue = cached.values.get(cacheKey);
    if (cachedValue) return cachedValue;
  }

  const { startMs, endMs } = buildContributionCalendarDateRange(
    resolvedMonth,
    now,
  );
  const dataMap = new Map<string, number>();

  for (
    let hourMs = startMs;
    hourMs <= endMs;
    hourMs = addLocalHours(hourMs, 1)
  ) {
    const hourKey = formatHourKey(hourMs);
    dataMap.set(hourKey, hourlyCounts.get(hourKey) ?? 0);
  }

  const nonZeroCounts = Array.from(dataMap.values())
    .filter((count) => count > 0)
    .sort((a, b) => a - b);

  const hours = Array.from(dataMap.entries())
    .map(([timestamp, count]) => {
      const [date, hourString] = timestamp.split('T');
      return {
        timestamp,
        date,
        hour: Number(hourString),
        count,
        level: getContributionLevel(count, nonZeroCounts),
      };
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const dailyCounts = new Map<string, number>();
  hours.forEach(({ date, count }) => {
    dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + count);
  });

  const days = Array.from(dailyCounts.entries())
    .map(([date, count]) => ({
      date,
      count,
      level: getContributionLevel(count, nonZeroCounts),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const currentRangeWindow = getWindowBounds(range, now);
  const previousRangeWindow = getPreviousWindowBounds(range, now);
  const rangeCount = sumHourlyCountsInWindow(hourlyCounts, currentRangeWindow);
  const previousRangeCount = previousRangeWindow
    ? sumHourlyCountsInWindow(hourlyCounts, previousRangeWindow)
    : 0;
  let rangeOverRangePercent: number | null = null;

  if (range !== 'all') {
    if (rangeCount === 0 && previousRangeCount === 0) {
      rangeOverRangePercent = 0;
    } else if (previousRangeCount > 0) {
      rangeOverRangePercent =
        ((rangeCount - previousRangeCount) / previousRangeCount) * 100;
    }
  }

  const previousMonth = addMonthsToMonthKey(resolvedMonth, -1);
  const selectedMonthCount = sumHourlyCountsInWindow(
    hourlyCounts,
    getMonthWindowBounds(resolvedMonth),
  );
  const previousMonthCount = sumHourlyCountsInWindow(
    hourlyCounts,
    getMonthWindowBounds(previousMonth),
  );
  let monthOverMonthPercent: number | null = null;

  if (selectedMonthCount === 0 && previousMonthCount === 0) {
    monthOverMonthPercent = 0;
  } else if (previousMonthCount > 0) {
    monthOverMonthPercent =
      ((selectedMonthCount - previousMonthCount) / previousMonthCount) * 100;
  }

  const currentDayMs = getLocalDayStart(now.getTime());
  const rolling7Start = addLocalDays(currentDayMs, -6);
  const prior7Start = addLocalDays(rolling7Start, -7);

  let thisWeekCount = 0;
  let lastWeekCount = 0;

  days.forEach(({ date, count }) => {
    const dayMs = parseCalendarDateKey(date);
    if (dayMs >= rolling7Start && dayMs <= currentDayMs) {
      thisWeekCount += count;
      return;
    }
    if (dayMs >= prior7Start && dayMs < rolling7Start) {
      lastWeekCount += count;
    }
  });

  let weekOverWeekPercent: number | null = null;
  let weekOverWeekLabel = '0% vs prior 7d';

  if (thisWeekCount === 0 && lastWeekCount === 0) {
    weekOverWeekPercent = 0;
  } else if (lastWeekCount > 0) {
    weekOverWeekPercent =
      ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
    const rounded = Math.round(weekOverWeekPercent);
    const sign = rounded > 0 ? '+' : '';
    weekOverWeekLabel = `${sign}${rounded}% vs prior 7d`;
  } else if (thisWeekCount > 0) {
    weekOverWeekLabel = 'New activity in last 7d';
  }

  const result = {
    hours,
    totalHoursShown: dataMap.size,
    selectedMonth: resolvedMonth,
    availableMonths,
    rangeCount,
    rangeLabel: getContributionRangeLabel(range),
    rangeOverRangePercent,
    selectedMonthCount,
    selectedMonthLabel: getCompactMonthLabel(resolvedMonth),
    previousMonthCount,
    previousMonthLabel: getCompactMonthLabel(previousMonth),
    monthOverMonthPercent,
    thisWeekCount,
    weekOverWeekPercent,
    weekOverWeekLabel,
  };

  if (
    !contributionCalendarResultCache ||
    contributionCalendarResultCache.prs !== prs ||
    contributionCalendarResultCache.issues !== issues ||
    contributionCalendarResultCache.currentHour !== currentHour
  ) {
    contributionCalendarResultCache = {
      prs,
      issues,
      currentHour,
      values: new Map(),
    };
  }

  contributionCalendarResultCache.values.set(cacheKey, result);

  return result;
};

// Each PR contributes to exactly one bucket, keyed by its terminal state and
// the timestamp that produced that state. API does not currently return
// closedAt for PRs — fall back to prCreatedAt so closed PRs are still windowed.
const getPrTerminalTimestamp = (
  pr: CommitLog,
  status: ReturnType<typeof getPrStatusLabel>,
): string | null | undefined => {
  if (status === 'Merged') return pr.mergedAt;
  if (status === 'Closed') return pr.closedAt ?? pr.prCreatedAt;
  return pr.prCreatedAt;
};

const getPrOverviewMetrics = (prs: CommitLog[], window: WindowBounds) => {
  const counts = { merged: 0, open: 0, closed: 0 };

  prs.forEach((pr) => {
    const status = getPrStatusLabel(pr);
    if (
      !isWithinWindow(toTimestamp(getPrTerminalTimestamp(pr, status)), window)
    )
      return;

    if (status === 'Merged') counts.merged += 1;
    else if (status === 'Closed') counts.closed += 1;
    else counts.open += 1;
  });

  return {
    total: counts.merged + counts.open + counts.closed,
    ...counts,
  };
};

// Issue discovery metrics are sourced from per-miner aggregates (which
// reflect every discovered issue) rather than the /issues endpoint (which
// only returns bounty-backed issues - far fewer). Aggregates are all-time
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

type IssueOverviewCounts = ReturnType<typeof getIssueOverviewMetricsFromMiners>;

/** Miner is on the Issue Discovery eligibility track (matches Issue leaderboard split). */
const prMatchesIssueEligibleTrack = (
  pr: CommitLog,
  issueEligibleGithubIds: Set<string>,
  minerByGithubLogin: Map<string, MinerEvaluation>,
): boolean => {
  if (pr.githubId && issueEligibleGithubIds.has(pr.githubId)) return true;
  const login = pr.author?.trim().toLowerCase();
  if (!login) return false;
  const miner = minerByGithubLogin.get(login);
  return miner?.isIssueEligible === true;
};

const filterIssueDiscoveryFlowPrs = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  wantEligibleTrack: boolean,
): CommitLog[] => {
  const issueEligibleGithubIds = new Set(
    miners
      .filter((m) => m.isIssueEligible === true)
      .map((m) => m.githubId)
      .filter(Boolean),
  );
  const minerByGithubLogin = new Map<string, MinerEvaluation>();
  miners.forEach((m) => {
    const login = m.githubUsername?.trim().toLowerCase();
    if (login) minerByGithubLogin.set(login, m);
  });

  return prs.filter((pr) => {
    if (!isIssueDiscoveryContributionPr(pr)) return false;
    const onEligibleTrack = prMatchesIssueEligibleTrack(
      pr,
      issueEligibleGithubIds,
      minerByGithubLogin,
    );
    return wantEligibleTrack ? onEligibleTrack : !onEligibleTrack;
  });
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

  const eligibleIssueDiscoveryPrs = filterIssueDiscoveryFlowPrs(
    prs,
    miners,
    true,
  );
  const ineligibleIssueDiscoveryPrs = filterIssueDiscoveryFlowPrs(
    prs,
    miners,
    false,
  );

  const currentEligibleIssueFlow =
    range === 'all'
      ? null
      : getPrOverviewMetrics(eligibleIssueDiscoveryPrs, currentWindow);
  const previousEligibleIssueFlow =
    range === 'all' || !previousWindow
      ? null
      : getPrOverviewMetrics(eligibleIssueDiscoveryPrs, previousWindow);

  const currentIneligibleIssueFlow =
    range === 'all'
      ? null
      : getPrOverviewMetrics(ineligibleIssueDiscoveryPrs, currentWindow);
  const previousIneligibleIssueFlow =
    range === 'all' || !previousWindow
      ? null
      : getPrOverviewMetrics(ineligibleIssueDiscoveryPrs, previousWindow);

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
    display: IssueOverviewCounts,
    flowCurrent: ReturnType<typeof getPrOverviewMetrics> | null,
    flowPrevious: ReturnType<typeof getPrOverviewMetrics> | null,
  ): DashboardOverviewPool => ({
    chartSegments: [
      { label: 'Solved', value: display.solved },
      { label: 'Open', value: display.open },
      { label: 'Closed', value: display.closed },
    ],
    chartCenterLabel: formatCenterPercent(
      display.solved,
      display.solved + display.closed,
    ),
    metrics: [
      {
        label: 'Total',
        value: display.total,
        delta: getMetricDelta(flowCurrent?.total ?? 0, flowPrevious?.total),
      },
      {
        label: 'Solved',
        value: display.solved,
        delta: getMetricDelta(flowCurrent?.merged ?? 0, flowPrevious?.merged),
      },
      {
        label: 'Open',
        value: display.open,
        delta: getMetricDelta(flowCurrent?.open ?? 0, flowPrevious?.open),
      },
      {
        label: 'Closed',
        value: display.closed,
        delta: getMetricDelta(flowCurrent?.closed ?? 0, flowPrevious?.closed),
      },
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
      eligible: buildIssuePool(
        eligibleIssueMetrics,
        currentEligibleIssueFlow,
        previousEligibleIssueFlow,
      ),
      ineligible: buildIssuePool(
        ineligibleIssueMetrics,
        currentIneligibleIssueFlow,
        previousIneligibleIssueFlow,
      ),
    },
  ];
};

export const buildDashboardKpis = (
  prs: CommitLog[],
  issues: MirrorDashboardIssue[],
  totalLinesCommitted: number,
  range: TrendTimeRange,
  now = new Date(),
): DashboardKpi[] => {
  const window = getWindowBounds(range, now);
  const mergedWindowPrs = prs.filter((pr) =>
    isWithinWindow(toTimestamp(pr.mergedAt), window),
  );
  const solvedIssues = issues.filter((issue) =>
    isResolvedInWindow(issue, window),
  );

  const totalCommits = mergedWindowPrs.reduce(
    (sum, pr) => sum + parseNumber(pr.commitCount),
    0,
  );
  const totalIssuesSolved = solvedIssues.length;
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
      ...optionalCredibilityMetrics(miner?.credibility),
    ],
    repos: topPr.repository ? [topPr.repository] : [],
    usdPerDay: parseNumber(miner?.usdPerDay),
    credibility: parseNumber(miner?.credibility),
    segments: [
      { label: 'Merged', value: parseNumber(miner?.totalMergedPrs) },
      { label: 'Open', value: parseNumber(miner?.totalOpenPrs) },
      { label: 'Closed', value: parseNumber(miner?.totalClosedPrs) },
    ],
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

      return a.githubId.localeCompare(b.githubId);
    })
    .find(
      (miner) =>
        parseNumber(miner.totalScore) > 0 && !exclude.has(miner.githubId),
    );

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
    usdPerDay: parseNumber(topOssMiner.usdPerDay),
    credibility: parseNumber(topOssMiner.credibility),
    segments: [
      { label: 'Merged', value: parseNumber(topOssMiner.totalMergedPrs) },
      { label: 'Open', value: parseNumber(topOssMiner.totalOpenPrs) },
      { label: 'Closed', value: parseNumber(topOssMiner.totalClosedPrs) },
    ],
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
    usdPerDay: parseNumber(mostMergedPrMiner.usdPerDay),
    credibility: parseNumber(mostMergedPrMiner.credibility),
    segments: [
      { label: 'Merged', value: parseNumber(mostMergedPrMiner.totalMergedPrs) },
      { label: 'Open', value: parseNumber(mostMergedPrMiner.totalOpenPrs) },
      { label: 'Closed', value: parseNumber(mostMergedPrMiner.totalClosedPrs) },
    ],
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

const isMergedInWindow = (pr: CommitLog, cutoff: number): boolean => {
  const merged: number | null = toTimestamp(pr.mergedAt);
  return (
    merged !== null &&
    merged >= cutoff &&
    getPrStatusLabel(pr) === 'Merged' &&
    Boolean(pr.repository)
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

export const buildFeaturedWork = (prs: CommitLog[]): FeaturedWorkRepo[] => {
  const config: FeaturedWorkConfig = FEATURED_WORK_CONFIG;
  const now: number = Date.now();
  const cutoff: number = now - config.windowHours * HOUR_MS;

  const windowPrs: CommitLog[] = prs.filter((pr: CommitLog): boolean =>
    isMergedInWindow(pr, cutoff),
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

const pickTopDiscoveryMiner = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  exclude: Set<string> = new Set(),
): DashboardFeaturedContributor | undefined => {
  const top = [...miners]
    .filter(
      (m) =>
        m.isIssueEligible &&
        parseNumber(m.issueDiscoveryScore) > 0 &&
        !exclude.has(m.githubId),
    )
    .sort((a, b) => {
      const diff =
        parseNumber(b.issueDiscoveryScore) - parseNumber(a.issueDiscoveryScore);
      return diff !== 0 ? diff : a.githubId.localeCompare(b.githubId);
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
    usdPerDay: parseNumber(top.usdPerDay),
    credibility: parseNumber(top.issueCredibility),
    segments: [
      { label: 'Solved', value: parseNumber(top.totalValidSolvedIssues) },
      { label: 'Open', value: parseNumber(top.totalOpenIssues) },
      { label: 'Closed', value: parseNumber(top.totalClosedIssues) },
    ],
  };
};

const pickMostSolvedIssuesMiner = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  exclude: Set<string> = new Set(),
): DashboardFeaturedContributor | undefined => {
  const top = [...miners]
    .filter(
      (m) =>
        m.isIssueEligible &&
        (m.totalValidSolvedIssues ?? 0) > 0 &&
        !exclude.has(m.githubId),
    )
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
    usdPerDay: parseNumber(top.usdPerDay),
    credibility: parseNumber(top.issueCredibility),
    segments: [
      { label: 'Solved', value: parseNumber(top.totalValidSolvedIssues) },
      { label: 'Open', value: parseNumber(top.totalOpenIssues) },
      { label: 'Closed', value: parseNumber(top.totalClosedIssues) },
    ],
  };
};

const pickHighestIssueTokenScoreMiner = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
  exclude: Set<string> = new Set(),
): DashboardFeaturedContributor | undefined => {
  const top = [...miners]
    .filter(
      (m) =>
        m.isIssueEligible &&
        parseNumber(m.issueTokenScore) > 0 &&
        !exclude.has(m.githubId),
    )
    .sort((a, b) => {
      const diff =
        parseNumber(b.issueTokenScore) - parseNumber(a.issueTokenScore);
      return diff !== 0 ? diff : a.githubId.localeCompare(b.githubId);
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
      ...optionalCredibilityMetrics(top.issueCredibility),
    ],
    repos: getTopContributorRepos(prs, top.githubId),
    usdPerDay: parseNumber(top.usdPerDay),
    credibility: parseNumber(top.issueCredibility),
    segments: [
      { label: 'Solved', value: parseNumber(top.totalValidSolvedIssues) },
      { label: 'Open', value: parseNumber(top.totalOpenIssues) },
      { label: 'Closed', value: parseNumber(top.totalClosedIssues) },
    ],
  };
};

export const buildFeaturedDiscoveryContributors = (
  prs: CommitLog[],
  miners: MinerEvaluation[],
): DashboardFeaturedContributor[] => {
  const seen = new Set<string>();
  const contributors: DashboardFeaturedContributor[] = [];
  const pickers: Array<() => DashboardFeaturedContributor | undefined> = [
    () => pickTopDiscoveryMiner(prs, miners, seen),
    () => pickMostSolvedIssuesMiner(prs, miners, seen),
    () => pickHighestIssueTokenScoreMiner(prs, miners, seen),
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
