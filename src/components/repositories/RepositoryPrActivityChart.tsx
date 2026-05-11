import React, { useMemo, useState } from 'react';
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  isValid,
  max,
  min,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import { useAllPrs, type CommitLog } from '../../api';
import { STATUS_COLORS } from '../../theme';
import {
  echartsAxisTooltipChrome,
  echartsFontFamily,
  echartsMutedCartesianAxisColors,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';

type ActivityRange = '7d' | '35d' | 'all';

const RANGE_OPTIONS: { value: ActivityRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '35d', label: '35D' },
  { value: 'all', label: 'All' },
];

const AREA_GRADIENT_STOPS = [
  { offset: 0, opacity: 0.28 },
  { offset: 1, opacity: 0 },
] as const;

function bucketMonthKey(d: Date): string {
  return format(startOfMonth(d), 'yyyy-MM');
}

function bucketDayKey(d: Date): string {
  return format(startOfDay(d), 'yyyy-MM-dd');
}

function countByKey(
  prs: CommitLog[],
  axisKeys: string[],
  pickDate: (pr: CommitLog) => string | null,
  bucketKey: (d: Date) => string,
): number[] {
  const counts = new Map<string, number>();
  axisKeys.forEach((k) => counts.set(k, 0));

  for (const pr of prs) {
    const raw = pickDate(pr);
    if (!raw) continue;
    const d = parseISO(raw);
    if (!isValid(d)) continue;
    const key = bucketKey(d);
    if (!counts.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return axisKeys.map((k) => counts.get(k) ?? 0);
}

function buildAxis(
  prs: CommitLog[],
  range: ActivityRange,
): { key: string; label: string; bucket: (d: Date) => string }[] {
  const today = new Date();

  if (range === '7d' || range === '35d') {
    const days = range === '7d' ? 7 : 35;
    const end = startOfDay(today);
    const start = startOfDay(subDays(end, days - 1));
    return eachDayOfInterval({ start, end }).map((d) => ({
      key: format(d, 'yyyy-MM-dd'),
      label: format(d, 'MMM d'),
      bucket: bucketDayKey,
    }));
  }

  const dates = prs.flatMap((pr) => {
    const rawDates = [pr.prCreatedAt, pr.mergedAt, pr.closedAt].filter(
      (raw): raw is string => !!raw,
    );
    return rawDates.map((raw) => parseISO(raw)).filter((d) => isValid(d));
  });

  const earliest = dates.length > 0 ? min(dates) : today;
  const latest = dates.length > 0 ? max(dates) : today;
  const start = startOfMonth(earliest);
  const end = startOfMonth(latest > today ? latest : today);

  return eachMonthOfInterval({ start, end }).map((d) => ({
    key: format(d, 'yyyy-MM'),
    label: format(d, 'MMM yy'),
    bucket: bucketMonthKey,
  }));
}

function areaFill(theme: Theme, color: string) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: AREA_GRADIENT_STOPS.map((stop) => ({
      offset: stop.offset,
      color: alpha(color, stop.opacity),
    })),
  };
}

function buildChartOption(
  theme: Theme,
  labels: string[],
  opened: number[],
  merged: number[],
) {
  const openedColor = alpha(theme.palette.primary.main, 0.92);
  const mergedColor = alpha(STATUS_COLORS.merged, 0.95);
  const chartFont = echartsFontFamily(theme);
  const { labelColor, axisLineColor, splitLineColor } =
    echartsMutedCartesianAxisColors(theme);

  return {
    ...echartsTransparentBackground(),
    animationDuration: 380,
    color: [openedColor, mergedColor],
    legend: {
      data: ['Opened', 'Merged'],
      top: 0,
      left: 'center',
      itemGap: 16,
      textStyle: {
        color: labelColor,
        fontSize: 10,
        fontFamily: chartFont,
      },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
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
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLabel: {
        color: labelColor,
        fontFamily: chartFont,
        fontSize: 10,
      },
      axisLine: { lineStyle: { color: axisLineColor } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      splitNumber: 4,
      axisLabel: {
        color: labelColor,
        fontFamily: chartFont,
        fontSize: 10,
      },
      splitLine: {
        lineStyle: { color: splitLineColor, type: 'dashed' as const },
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Opened',
        type: 'line',
        smooth: 0.2,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 5,
        data: opened,
        lineStyle: { width: 2, color: openedColor },
        areaStyle: { color: areaFill(theme, openedColor) },
      },
      {
        name: 'Merged',
        type: 'line',
        smooth: 0.2,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 5,
        data: merged,
        lineStyle: { width: 2, color: mergedColor },
        areaStyle: { color: areaFill(theme, mergedColor) },
      },
    ],
  };
}

interface RepositoryPrActivityChartProps {
  repositoryFullName: string;
}

const RepositoryPrActivityChart: React.FC<RepositoryPrActivityChartProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const [range, setRange] = useState<ActivityRange>('7d');
  const { data: allPrs, isLoading } = useAllPrs();

  const repoPrs = useMemo(() => {
    if (!allPrs) return [];
    const lower = repositoryFullName.toLowerCase();
    return allPrs.filter((pr) => pr.repository.toLowerCase() === lower);
  }, [allPrs, repositoryFullName]);

  const { labels, openedSeries, mergedSeries, hasAny } = useMemo(() => {
    const axis = buildAxis(repoPrs, range);
    const axisKeys = axis.map((item) => item.key);
    const labelsLocal = axis.map((item) => item.label);
    const bucket = axis[0]?.bucket ?? bucketDayKey;
    const opened = countByKey(
      repoPrs,
      axisKeys,
      (pr) => pr.prCreatedAt,
      bucket,
    );
    const merged = countByKey(repoPrs, axisKeys, (pr) => pr.mergedAt, bucket);
    const hasAnyLocal = opened.some((n) => n > 0) || merged.some((n) => n > 0);
    return {
      labels: labelsLocal,
      openedSeries: opened,
      mergedSeries: merged,
      hasAny: hasAnyLocal,
    };
  }, [repoPrs, range]);

  const chartOption = useMemo(
    () => buildChartOption(theme, labels, openedSeries, mergedSeries),
    [theme, labels, openedSeries, mergedSeries],
  );

  if (isLoading && !allPrs) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            mb: 2,
            fontSize: '14px',
          }}
        >
          PR Activity
        </Typography>
        <Skeleton
          variant="rectangular"
          height={220}
          sx={{ bgcolor: 'surface.light', borderRadius: 2 }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          PR Activity
        </Typography>
        <FormControl size="small" sx={{ minWidth: 88 }}>
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value as ActivityRange)}
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 30,
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
          height: 220,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'border.light',
          bgcolor: 'surface.subtle',
          '& > div': { width: '100%', height: '100%' },
        }}
      >
        {!hasAny ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ height: '100%', px: 2, textAlign: 'center' }}
          >
            <Typography
              sx={{
                color: alpha(theme.palette.text.primary, 0.65),
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              No PRs in this range
            </Typography>
            <Typography
              sx={{
                color: alpha(theme.palette.text.primary, 0.45),
                fontSize: '0.72rem',
                mt: 0.5,
              }}
            >
              Try a longer window or check back later.
            </Typography>
          </Stack>
        ) : (
          <ReactECharts
            option={chartOption}
            notMerge
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        )}
      </Box>
    </Box>
  );
};

export default RepositoryPrActivityChart;
