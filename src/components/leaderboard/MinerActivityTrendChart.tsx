import React, { useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import {
  eachDayOfInterval,
  format,
  isValid,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import type { CommitLog } from '../../api/models/Dashboard';
import { GITTENSOR_START_MS } from '../../pages/dashboard/dashboardData';
import { CHART_COLORS } from '../../theme';
import {
  echartsAxisTooltipChrome,
  echartsFontFamily,
  echartsMutedCartesianAxisColors,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';
import { isMergedPr } from '../../utils/prStatus';
import { ChartEmptyPanel } from '../common/ChartEmptyPanel';

export type MinerActivityRange = '7d' | '35d' | 'all';

const RANGE_OPTIONS: { value: MinerActivityRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '35d', label: '35D' },
  { value: 'all', label: 'All' },
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const LINE_SMOOTH = 0.35;
const SERIES_LINE_OPACITY = 0.82;
const SERIES_AXIS_LABEL_OPACITY = 0.58;
const SERIES_LEGEND_OPACITY = 0.72;

const getMinerActivitySeriesColors = (theme: Theme) => {
  const rewardsBase = theme.palette.diff.additions;
  const minersBase = CHART_COLORS.series[3];
  return {
    rewardsLine: alpha(rewardsBase, SERIES_LINE_OPACITY),
    rewardsAxis: alpha(rewardsBase, SERIES_AXIS_LABEL_OPACITY),
    rewardsLegend: alpha(rewardsBase, SERIES_LEGEND_OPACITY),
    minersLine: alpha(minersBase, SERIES_LINE_OPACITY),
    minersAxis: alpha(minersBase, SERIES_AXIS_LABEL_OPACITY),
    minersLegend: alpha(minersBase, SERIES_LEGEND_OPACITY),
  };
};
const CHART_HEIGHT_DEFAULT = 280;
const CHART_HEIGHT_SIDEBAR = 220;

const formatRewardsAxis = (value: number): string => {
  if (value >= 1000) {
    const compact = value / 1000;
    const rounded =
      compact >= 10 ? Math.round(compact) : Math.round(compact * 10) / 10;
    return `${rounded}k`;
  }
  return String(Math.round(value));
};

type ActivityBucket = {
  key: string;
  label: string;
  startMs: number;
  endMs: number;
};

function bucketDayKey(d: Date): string {
  return format(startOfDay(d), 'yyyy-MM-dd');
}

function getUtcWeekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const dayOfWeek = date.getUTCDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - diffToMonday,
  );
}

function buildActivityBuckets(range: MinerActivityRange): ActivityBucket[] {
  const now = Date.now();
  const endDay = startOfDay(new Date());

  if (range === '7d' || range === '35d') {
    const days = range === '7d' ? 7 : 35;
    const start = startOfDay(subDays(endDay, days - 1));
    return eachDayOfInterval({ start, end: endDay }).map((d) => {
      const startMs = startOfDay(d).getTime();
      return {
        key: bucketDayKey(d),
        label: format(d, 'MMM d'),
        startMs,
        endMs: startMs + 24 * 60 * 60 * 1000,
      };
    });
  }

  const firstWeekStart = getUtcWeekStart(GITTENSOR_START_MS);
  const currentWeekStart = getUtcWeekStart(now);
  const endExclusive = currentWeekStart + WEEK_MS;
  const buckets: ActivityBucket[] = [];

  for (
    let bucketStart = firstWeekStart;
    bucketStart < endExclusive;
    bucketStart += WEEK_MS
  ) {
    buckets.push({
      key: String(bucketStart),
      label: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(bucketStart)),
      startMs: bucketStart,
      endMs: bucketStart + WEEK_MS,
    });
  }

  return buckets;
}

function findBucketIndex(timestamp: number, buckets: ActivityBucket[]): number {
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    if (timestamp >= bucket.startMs && timestamp < bucket.endMs) {
      return index;
    }
  }
  return -1;
}

function aggregateMinerActivity(
  prs: CommitLog[],
  buckets: ActivityBucket[],
  minerGithubIds?: Set<string>,
  repositoryFullName?: string,
): { rewards: number[]; activeMiners: number[] } {
  const repoLower = repositoryFullName?.toLowerCase();
  const rewards = Array.from({ length: buckets.length }, () => 0);
  const minersByBucket = buckets.map(() => new Set<string>());

  for (const pr of prs) {
    if (!isMergedPr(pr)) continue;
    if (repoLower && pr.repository?.toLowerCase() !== repoLower) continue;
    if (minerGithubIds?.size) {
      const id = pr.githubId?.trim();
      if (!id || !minerGithubIds.has(id)) continue;
    }
    const raw = pr.mergedAt;
    if (!raw) continue;
    const merged = parseISO(raw);
    if (!isValid(merged)) continue;
    const index = findBucketIndex(merged.getTime(), buckets);
    if (index < 0) continue;

    rewards[index] += Number.parseFloat(pr.score || '0') || 0;
    const minerKey = pr.githubId?.trim() || pr.author?.trim().toLowerCase();
    if (minerKey) minersByBucket[index].add(minerKey);
  }

  return {
    rewards,
    activeMiners: minersByBucket.map((set) => set.size),
  };
}

function buildMinerActivityChartOption(
  theme: Theme,
  labels: string[],
  rewards: number[],
  activeMiners: number[],
  range: MinerActivityRange,
) {
  const chartFont = echartsFontFamily(theme);
  const { labelColor, axisLineColor, splitLineColor } =
    echartsMutedCartesianAxisColors(theme);
  const labelInterval = range === '7d' ? 0 : range === '35d' ? 6 : 'auto';
  const seriesColors = getMinerActivitySeriesColors(theme);

  return {
    ...echartsTransparentBackground(),
    animationDuration: 420,
    color: [seriesColors.rewardsLine, seriesColors.minersLine],
    legend: {
      data: [
        {
          name: 'Rewards (α)',
          itemStyle: { color: seriesColors.rewardsLegend },
        },
        {
          name: 'Active Miners',
          itemStyle: { color: seriesColors.minersLegend },
        },
      ],
      top: 0,
      left: 'center',
      itemGap: 16,
      textStyle: {
        color: labelColor,
        fontSize: 9,
        fontFamily: chartFont,
      },
      icon: 'circle',
      itemWidth: 7,
      itemHeight: 7,
    },
    grid: {
      left: '2%',
      right: '2%',
      top: 36,
      bottom: 6,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      appendTo: () => document.body,
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: alpha(theme.palette.text.primary, 0.18),
          width: 1,
        },
      },
      ...echartsAxisTooltipChrome(theme),
      padding: [10, 12],
      textStyle: {
        color: theme.palette.text.primary,
        fontFamily: chartFont,
        fontSize: 11,
      },
      formatter: (
        params: Array<{
          axisValueLabel: string;
          seriesName: string;
          value: number;
          color?: string;
        }>,
      ) => {
        const rows = params
          .map((entry) => {
            const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${entry.color ?? theme.palette.text.primary};margin-right:8px;"></span>`;
            const formatted =
              entry.seriesName === 'Rewards (α)'
                ? Math.round(entry.value ?? 0).toLocaleString()
                : String(entry.value ?? 0);
            return `<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;">
              <span style="display:inline-flex;align-items:center;color:${alpha(theme.palette.text.primary, 0.62)};">${dot}${entry.seriesName}</span>
              <span style="font-weight:700;">${formatted}</span>
            </div>`;
          })
          .join('');
        return `<div style="display:grid;gap:6px;min-width:150px;font-family:${chartFont};">
          <div style="font-weight:700;">${params[0]?.axisValueLabel ?? ''}</div>
          ${rows}
        </div>`;
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLabel: {
        color: labelColor,
        fontFamily: chartFont,
        fontSize: 9,
        interval: labelInterval,
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: axisLineColor } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        min: 0,
        splitNumber: 4,
        position: 'left',
        axisLabel: {
          color: seriesColors.rewardsAxis,
          fontFamily: chartFont,
          fontSize: 9,
          formatter: (value: number) => formatRewardsAxis(value),
        },
        splitLine: {
          lineStyle: { color: splitLineColor, type: 'dashed' as const },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      {
        type: 'value',
        min: 0,
        splitNumber: 4,
        position: 'right',
        axisLabel: {
          color: seriesColors.minersAxis,
          fontFamily: chartFont,
          fontSize: 9,
        },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
    ],
    series: [
      {
        name: 'Rewards (α)',
        type: 'line',
        yAxisIndex: 0,
        smooth: LINE_SMOOTH,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 5,
        data: rewards,
        lineStyle: {
          width: 2,
          color: seriesColors.rewardsLine,
        },
        itemStyle: { color: seriesColors.rewardsLine },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 2.5 },
        },
      },
      {
        name: 'Active Miners',
        type: 'line',
        yAxisIndex: 1,
        smooth: LINE_SMOOTH,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 5,
        data: activeMiners,
        lineStyle: {
          width: 2,
          color: seriesColors.minersLine,
        },
        itemStyle: { color: seriesColors.minersLine },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 2.5 },
        },
      },
    ],
  };
}

export interface MinerActivityTrendChartProps {
  prs: CommitLog[] | undefined;
  isLoading?: boolean;
  /** When set, only merged PRs from these GitHub IDs are counted. */
  minerGithubIds?: Set<string>;
  /** When set, only PRs in this repository are counted. */
  repositoryFullName?: string;
  title?: string;
  /** Sidebar layout — shorter chart for the right column. */
  variant?: 'default' | 'sidebar';
}

const MinerActivityTrendChart: React.FC<MinerActivityTrendChartProps> = ({
  prs,
  isLoading = false,
  minerGithubIds,
  repositoryFullName,
  title = 'Miner Activity',
  variant = 'default',
}) => {
  const theme = useTheme();
  const [range, setRange] = useState<MinerActivityRange>('35d');
  const isSidebar = variant === 'sidebar';
  const chartHeight = isSidebar ? CHART_HEIGHT_SIDEBAR : CHART_HEIGHT_DEFAULT;

  const buckets = useMemo(() => buildActivityBuckets(range), [range]);

  const { rewards, activeMiners, hasAny } = useMemo(() => {
    const rows = prs ?? [];
    const { rewards: rewardValues, activeMiners: minerCounts } =
      aggregateMinerActivity(rows, buckets, minerGithubIds, repositoryFullName);
    const any =
      rewardValues.some((n) => n > 0) || minerCounts.some((n) => n > 0);
    return {
      rewards: rewardValues,
      activeMiners: minerCounts,
      hasAny: any,
    };
  }, [prs, buckets, minerGithubIds, repositoryFullName]);

  const chartOption = useMemo(
    () =>
      buildMinerActivityChartOption(
        theme,
        buckets.map((b) => b.label),
        rewards,
        activeMiners,
        range,
      ),
    [theme, buckets, rewards, activeMiners, range],
  );

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: isSidebar ? 'background.default' : 'surface.subtle',
        overflow: 'hidden',
        flexShrink: 0,
        width: '100%',
        ...(isSidebar && { mt: 2, mb: 4 }),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{
          px: isSidebar ? 2 : { xs: 1.35, sm: 1.5 },
          pt: isSidebar ? 2 : 1.35,
          pb: 0.5,
        }}
      >
        <Typography
          sx={{
            color: 'text.primary',
            fontSize: isSidebar ? '0.9rem' : { xs: '1rem', sm: '1.05rem' },
            fontWeight: 700,
          }}
        >
          {title}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 72, flexShrink: 0 }}>
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value as MinerActivityRange)}
            sx={{
              height: 26,
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(theme.palette.text.primary, 0.2),
              },
            }}
          >
            {RANGE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value} dense>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box
        sx={{
          width: '100%',
          height: chartHeight,
          px: isSidebar ? 1.5 : { xs: 0.5, sm: 1 },
          pb: isSidebar ? 2 : 1,
          '& > div': { width: '100%', height: '100%' },
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={28} />
          </Box>
        ) : (
          <ChartEmptyPanel
            empty={!hasAny}
            minHeight={chartHeight}
            title="No miner activity in this range"
            hint="Rewards and active miners appear once merged PRs are recorded in the selected window."
          >
            <ReactECharts
              option={chartOption}
              notMerge
              style={{ width: '100%', height: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </ChartEmptyPanel>
        )}
      </Box>
    </Box>
  );
};

export default MinerActivityTrendChart;
