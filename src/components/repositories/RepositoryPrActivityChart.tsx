import React, { useMemo, useState } from 'react';
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
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
import { useAllPrs, useRepositoryIssues } from '../../api';
import { STATUS_COLORS } from '../../theme';
import {
  echartsAxisTooltipChrome,
  echartsFontFamily,
  echartsMutedCartesianAxisColors,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';

type ActivityRange = '7d' | '35d' | 'all';
type ChartMode = 'line' | 'bar';

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

function countByKey<T>(
  items: T[],
  axisKeys: string[],
  pickDate: (item: T) => string | null,
  bucketKey: (d: Date) => string,
): number[] {
  const counts = new Map<string, number>();
  axisKeys.forEach((k) => counts.set(k, 0));

  for (const item of items) {
    const raw = pickDate(item);
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
  dateStrings: string[],
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

  const dates = dateStrings
    .filter((raw): raw is string => !!raw)
    .map((raw) => parseISO(raw))
    .filter((d) => isValid(d));

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
  prOpened: number[],
  prMerged: number[],
  mode: ChartMode,
  firstLabel = 'Opened',
  secondLabel = 'Merged',
  secondSeriesColor?: string,
) {
  const prOpenedColor = alpha(theme.palette.primary.main, 0.92);
  const prMergedColor = secondSeriesColor ?? alpha(STATUS_COLORS.merged, 0.95);
  const chartFont = echartsFontFamily(theme);
  const { labelColor, axisLineColor, splitLineColor } =
    echartsMutedCartesianAxisColors(theme);

  return {
    ...echartsTransparentBackground(),
    animationDuration: 380,
    color: [prOpenedColor, prMergedColor],
    legend: {
      data: [firstLabel, secondLabel],
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
      boundaryGap: mode === 'bar',
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
        name: firstLabel,
        type: mode,
        smooth: 0.2,
        showSymbol: false,
        symbol: mode === 'line' ? 'circle' : undefined,
        symbolSize: mode === 'line' ? 6 : undefined,
        data: prOpened,
        lineStyle: { width: 2, color: prOpenedColor },
        areaStyle:
          mode === 'line'
            ? { color: areaFill(theme, prOpenedColor) }
            : undefined,
        itemStyle: mode === 'bar' ? { borderRadius: [4, 4, 0, 0] } : undefined,
        emphasis:
          mode === 'line'
            ? {
                focus: 'series',
                scale: true,
              }
            : undefined,
      },
      {
        name: secondLabel,
        type: mode,
        smooth: 0.2,
        showSymbol: false,
        symbol: mode === 'line' ? 'circle' : undefined,
        symbolSize: mode === 'line' ? 6 : undefined,
        data: prMerged,
        lineStyle: { width: 2, color: prMergedColor },
        areaStyle:
          mode === 'line'
            ? { color: areaFill(theme, prMergedColor) }
            : undefined,
        itemStyle: mode === 'bar' ? { borderRadius: [4, 4, 0, 0] } : undefined,
        emphasis:
          mode === 'line'
            ? {
                focus: 'series',
                scale: true,
              }
            : undefined,
      },
    ],
  };
}

interface RepositoryPrActivityChartProps {
  repositoryFullName: string;
  viewMode?: 'prs' | 'issues';
}

const RepositoryPrActivityChart: React.FC<RepositoryPrActivityChartProps> = ({
  repositoryFullName,
  viewMode = 'prs',
}) => {
  const theme = useTheme();
  const [range, setRange] = useState<ActivityRange>('35d');
  const [chartMode, setChartMode] = useState<ChartMode>('line');
  const { data: allPrs, isLoading } = useAllPrs();
  const { data: issues, isLoading: isLoadingIssues } =
    useRepositoryIssues(repositoryFullName);
  const isIssueMode = viewMode === 'issues';

  const repoPrs = useMemo(() => {
    if (!allPrs) return [];
    const lower = repositoryFullName.toLowerCase();
    return allPrs.filter((pr) => pr.repository.toLowerCase() === lower);
  }, [allPrs, repositoryFullName]);

  const { labels, firstSeries, secondSeries, hasAny } = useMemo(() => {
    const issueRows = issues ?? [];
    const axis = buildAxis(
      isIssueMode
        ? issueRows
            .flatMap((issue) => [issue.createdAt, issue.closedAt])
            .filter((v): v is string => Boolean(v))
        : repoPrs
            .flatMap((pr) => [pr.prCreatedAt, pr.mergedAt, pr.closedAt])
            .filter((v): v is string => Boolean(v)),
      range,
    );
    const axisKeys = axis.map((item) => item.key);
    const labelsLocal = axis.map((item) => item.label);
    const bucket = axis[0]?.bucket ?? bucketDayKey;
    const first = isIssueMode
      ? countByKey(issueRows, axisKeys, (issue) => issue.createdAt, bucket)
      : countByKey(repoPrs, axisKeys, (pr) => pr.prCreatedAt, bucket);
    const second = isIssueMode
      ? countByKey(issueRows, axisKeys, (issue) => issue.closedAt, bucket)
      : countByKey(repoPrs, axisKeys, (pr) => pr.mergedAt, bucket);
    const hasAnyLocal = first.some((n) => n > 0) || second.some((n) => n > 0);
    return {
      labels: labelsLocal,
      firstSeries: first,
      secondSeries: second,
      hasAny: hasAnyLocal,
    };
  }, [repoPrs, issues, range, isIssueMode]);

  const firstLabel = isIssueMode ? 'Opened' : 'Opened';
  const secondLabel = isIssueMode ? 'Closed' : 'Merged';
  const secondColor = isIssueMode
    ? alpha(STATUS_COLORS.closed, 0.95)
    : alpha(STATUS_COLORS.merged, 0.95);

  const chartOption = useMemo(
    () =>
      buildChartOption(
        theme,
        labels,
        firstSeries,
        secondSeries,
        chartMode,
        firstLabel,
        secondLabel,
        secondColor,
      ),
    [
      theme,
      labels,
      firstSeries,
      secondSeries,
      chartMode,
      firstLabel,
      secondLabel,
      secondColor,
    ],
  );

  if (
    (isLoading && !allPrs && !isIssueMode) ||
    (isLoadingIssues && !issues && isIssueMode)
  ) {
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
          {isIssueMode ? 'Issue Activity' : 'PR Activity'}
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
    <Box sx={{ mb: 4, minWidth: 0 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 1 }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          {isIssueMode ? 'Issue Activity' : 'PR Activity'}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'space-between', sm: 'flex-end' },
            minWidth: 0,
          }}
        >
          <ToggleButtonGroup
            value={chartMode}
            exclusive
            onChange={(_, next) => {
              if (next) setChartMode(next as ChartMode);
            }}
            size="small"
            sx={{
              bgcolor: 'surface.tooltip',
              borderRadius: 999,
              p: 0.25,
              flexShrink: 0,
              border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
              '& .MuiToggleButtonGroup-grouped': {
                border: 0,
                borderRadius: '999px !important',
                minWidth: 34,
                height: 26,
                color: alpha(theme.palette.text.primary, 0.68),
                px: 0.75,
                '&.Mui-selected': {
                  color: theme.palette.background.paper,
                  bgcolor: alpha(theme.palette.diff.additions, 0.92),
                },
              },
            }}
          >
            <ToggleButton value="line" aria-label="Line chart">
              <ShowChartIcon sx={{ fontSize: 14 }} />
            </ToggleButton>
            <ToggleButton value="bar" aria-label="Bar chart">
              <BarChartIcon sx={{ fontSize: 14 }} />
            </ToggleButton>
          </ToggleButtonGroup>
          <FormControl
            size="small"
            sx={{ minWidth: 78, width: { xs: 'auto', sm: 84 }, flexShrink: 0 }}
          >
            <Select
              value={range}
              onChange={(e) => setRange(e.target.value as ActivityRange)}
              sx={{
                height: 28,
                fontSize: '0.75rem',
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
      </Stack>

      <Box
        sx={{
          width: '100%',
          height: 220,
          overflow: 'hidden',
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
              No activity in this range
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
