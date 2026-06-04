import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { type Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import ReactECharts from 'echarts-for-react';
import { format, startOfDay, startOfHour, subDays, subHours } from 'date-fns';
import { LEADERBOARD_TRACK_COLORS, tooltipSlotProps } from '../../theme';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import {
  echartsAxisTooltipChrome,
  echartsFontFamily,
  echartsMutedCartesianAxisColors,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';
import {
  useRecentCommits,
  useMinerIssues,
  MINER_ISSUES_FULL_HISTORY_SINCE_ISO,
} from '../../api';
import { minerSolvedIssueAt } from './useMinerActivityIndex';

interface SparklineDetailModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  /** GitHub numeric ID — required for the 1D view's hourly bucketing. */
  githubId?: string;
  primaryValues: readonly number[];
  secondaryValues: readonly number[];
  primaryLabel?: string;
  secondaryLabel?: string;
}

type ChartMode = 'stack' | 'bar' | 'line';
type RangeKey = '1d' | '7d' | '30d';

interface RangeOption {
  key: RangeKey;
  label: string;
  /** Number of buckets in this range. */
  points: number;
  /** Width of one bucket in milliseconds. */
  bucketMs: number;
  /** Date-fns label format used for the x-axis tick. */
  tickFormat: string;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const RANGE_OPTIONS: readonly RangeOption[] = [
  {
    key: '1d',
    label: '1D',
    points: 8,
    bucketMs: 3 * HOUR_MS,
    tickFormat: 'HH:mm',
  },
  { key: '7d', label: '7D', points: 7, bucketMs: DAY_MS, tickFormat: 'MMM d' },
  {
    key: '30d',
    label: '30D',
    points: 30,
    bucketMs: DAY_MS,
    tickFormat: 'MMM d',
  },
] as const;

interface GradientStop {
  offset: number;
  opacity: number;
}

const AREA_GRADIENT: readonly GradientStop[] = [
  { offset: 0, opacity: 0.36 },
  { offset: 1, opacity: 0 },
];

const BAR_GRADIENT: readonly GradientStop[] = [
  { offset: 0, opacity: 0.95 },
  { offset: 1, opacity: 0.55 },
];

const buildBuckets = (range: RangeOption, now = Date.now()) => {
  const totalMs = range.points * range.bucketMs;
  const anchor =
    range.key === '1d'
      ? startOfHour(subHours(now, totalMs / HOUR_MS)).getTime()
      : startOfDay(subDays(now, range.points - 1)).getTime();
  return Array.from({ length: range.points }, (_, i) => {
    const startMs = anchor + i * range.bucketMs;
    return {
      startMs,
      endMs: startMs + range.bucketMs,
      label: format(new Date(startMs), range.tickFormat),
    };
  });
};

const totalOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

const findPeak = (
  primary: readonly number[],
  secondary: readonly number[],
  labels: readonly string[],
): { total: number; label: string } => {
  let bestTotal = 0;
  let bestLabel = '';
  for (let i = 0; i < primary.length; i += 1) {
    const t = (primary[i] ?? 0) + (secondary[i] ?? 0);
    if (t > bestTotal) {
      bestTotal = t;
      bestLabel = labels[i] ?? '';
    }
  }
  return { total: bestTotal, label: bestLabel };
};

const linearFill = (color: string, stops: readonly GradientStop[]) => ({
  type: 'linear' as const,
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: stops.map((s) => ({
    offset: s.offset,
    color: alpha(color, s.opacity),
  })),
});

const headerStatTileSx = (theme: Theme) => ({
  flex: '1 1 0',
  minWidth: 0,
  px: 1.25,
  py: 1,
  borderRadius: 1.5,
  border: `1px solid ${theme.palette.border.subtle}`,
  backgroundColor: alpha(theme.palette.text.primary, 0.025),
});

const capsuleToggleSx = (theme: Theme, count: number, index: number) => ({
  position: 'relative',
  gap: 0,
  p: 0.25,
  borderRadius: 999,
  border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
  backgroundColor: alpha(theme.palette.text.primary, 0.035),
  overflow: 'hidden',
  // Pill width matches a single button so translateX(i × 100%) snaps to button i.
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    width: `calc((100% - 6px) / ${count})`,
    borderRadius: 999,
    backgroundColor: alpha(theme.palette.text.primary, 0.14),
    boxShadow: 'none',
    transform: `translateX(${index * 100}%)`,
    transition: 'transform 0.22s ease',
  },
  '& .MuiToggleButtonGroup-grouped': {
    zIndex: 1,
    flex: 1,
    border: 0,
    borderRadius: '999px !important',
    minWidth: 40,
    height: 28,
    px: 1,
    color: alpha(theme.palette.text.primary, 0.6),
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    '&.Mui-selected, &.Mui-selected:hover': {
      color: theme.palette.text.primary,
      backgroundColor: 'transparent',
    },
    '&:hover': {
      backgroundColor: 'transparent',
      color: theme.palette.text.primary,
    },
  },
});

const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  accentColor?: string;
}> = ({ label, value, caption, accentColor }) => {
  const theme = useTheme();
  return (
    <Box sx={headerStatTileSx(theme)}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          mb: '4px',
        }}
      >
        {accentColor && (
          <Box
            component="span"
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: accentColor,
              flexShrink: 0,
            }}
          />
        )}
        <Typography
          sx={{
            fontSize: '0.58rem',
            color: alpha(theme.palette.text.primary, 0.5),
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '1.1rem',
          fontWeight: 700,
          color: 'text.primary',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
      {caption && (
        <Typography
          sx={{
            fontSize: '0.65rem',
            color: alpha(theme.palette.text.primary, 0.45),
            fontFamily: '"JetBrains Mono", monospace',
            mt: '2px',
            lineHeight: 1.2,
          }}
        >
          {caption}
        </Typography>
      )}
    </Box>
  );
};

const SparklineDetailModal: React.FC<SparklineDetailModalProps> = ({
  open,
  onClose,
  username,
  githubId,
  primaryValues,
  secondaryValues,
  primaryLabel = 'OSS',
  secondaryLabel = 'Discovery',
}) => {
  const theme = useTheme();
  const [mode, setMode] = useState<ChartMode>('stack');
  const [range, setRange] = useState<RangeKey>('30d');

  // 1D view re-buckets raw commits + solved issues into 3-hour slots; the daily
  // props can't be re-sliced that finely. Only fetched while the modal is open.
  const { data: recentCommits } = useRecentCommits(500);
  const { data: minerIssues } = useMinerIssues(
    githubId ?? '',
    open && !!githubId,
    MINER_ISSUES_FULL_HISTORY_SINCE_ISO,
  );

  const activeRange = useMemo(
    () => RANGE_OPTIONS.find((r) => r.key === range) ?? RANGE_OPTIONS[2],
    [range],
  );

  const { labels, primary, secondary } = useMemo(() => {
    if (range === '1d') {
      const buckets = buildBuckets(activeRange);
      const oss = new Array(buckets.length).fill(0);
      const disc = new Array(buckets.length).fill(0);
      const commits = recentCommits ?? [];
      for (const c of commits) {
        if (githubId && c.githubId?.trim() !== githubId) continue;
        if (!c.mergedAt) continue;
        const t = Date.parse(c.mergedAt);
        if (!Number.isFinite(t)) continue;
        const slot = buckets.findIndex((b) => t >= b.startMs && t < b.endMs);
        if (slot < 0) continue;
        oss[slot] += 1;
      }
      for (const issue of minerIssues ?? []) {
        const solvedAt = minerSolvedIssueAt(issue, githubId ?? '');
        if (solvedAt === null) continue;
        const slot = buckets.findIndex(
          (b) => solvedAt >= b.startMs && solvedAt < b.endMs,
        );
        if (slot < 0) continue;
        disc[slot] += 1;
      }
      return {
        labels: buckets.map((b) => b.label),
        primary: oss,
        secondary: disc,
      };
    }
    const len = Math.min(
      activeRange.points,
      Math.max(primaryValues.length, secondaryValues.length),
    );
    const buckets = buildBuckets(activeRange);
    return {
      labels: buckets.map((b) => b.label),
      primary: [...primaryValues.slice(-len)],
      secondary: [...secondaryValues.slice(-len)],
    };
  }, [
    range,
    activeRange,
    recentCommits,
    minerIssues,
    githubId,
    primaryValues,
    secondaryValues,
  ]);

  const totalPrimary = totalOf(primary);
  const totalSecondary = totalOf(secondary);
  const grandTotal = totalPrimary + totalSecondary;
  const peak = useMemo(
    () => findPeak(primary, secondary, labels),
    [primary, secondary, labels],
  );

  const chartOption = useMemo(() => {
    const primaryColor = LEADERBOARD_TRACK_COLORS.oss;
    const secondaryColor = LEADERBOARD_TRACK_COLORS.discovery;
    const chartFont = echartsFontFamily(theme);
    const { labelColor, axisLineColor, splitLineColor } =
      echartsMutedCartesianAxisColors(theme);

    const buildSeries = (
      name: string,
      data: number[],
      color: string,
      isPrimary: boolean,
    ) => {
      if (mode === 'line') {
        return {
          name,
          type: 'line' as const,
          smooth: 0.25,
          showSymbol: false,
          symbol: 'circle',
          symbolSize: 6,
          data,
          lineStyle: { width: 2.25, color },
          areaStyle: { color: linearFill(color, AREA_GRADIENT) },
          emphasis: { focus: 'series' as const, scale: true },
        };
      }
      const stacked = mode === 'stack';
      return {
        name,
        type: 'bar' as const,
        data,
        stack: stacked ? 'total' : undefined,
        barCategoryGap: stacked ? '32%' : '28%',
        barGap: stacked ? 0 : '14%',
        barMaxWidth: stacked ? 28 : 18,
        itemStyle: {
          color: linearFill(color, BAR_GRADIENT),
          borderRadius: stacked && isPrimary ? 0 : [4, 4, 0, 0],
        },
        emphasis: { focus: 'series' as const },
      };
    };

    return {
      ...echartsTransparentBackground(),
      animationDuration: 420,
      color: [primaryColor, secondaryColor],
      legend: { show: false },
      grid: { left: '2%', right: '2%', top: 12, bottom: 6, containLabel: true },
      tooltip: {
        trigger: 'axis',
        confine: true,
        appendTo: () => document.body,
        axisPointer: {
          type: mode === 'line' ? 'line' : 'shadow',
          lineStyle: {
            color: alpha(theme.palette.text.primary, 0.22),
            width: 1,
          },
          shadowStyle: { color: alpha(theme.palette.text.primary, 0.05) },
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
            color: string;
          }>,
        ) => {
          const rows = params
            .map((p) => {
              const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:8px;"></span>`;
              return `<div style="display:flex;align-items:center;justify-content:space-between;gap:18px;">
                <span style="color:${alpha(theme.palette.text.primary, 0.7)};">${dot}${p.seriesName}</span>
                <span style="color:${theme.palette.text.primary};font-weight:700;">${p.value ?? 0}</span>
              </div>`;
            })
            .join('');
          const sum = params.reduce((s, p) => s + (p.value ?? 0), 0);
          const totalRow =
            params.length > 1
              ? `<div style="margin-top:4px;padding-top:6px;border-top:1px solid ${alpha(theme.palette.text.primary, 0.1)};display:flex;justify-content:space-between;gap:18px;">
                  <span style="color:${theme.palette.text.primary};font-weight:700;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;">Total</span>
                  <span style="color:${theme.palette.text.primary};font-weight:700;">${sum}</span>
                </div>`
              : '';
          return `<div style="font-family:${chartFont};min-width:160px;display:grid;gap:6px;">
            <div style="color:${theme.palette.text.primary};font-weight:700;">${params[0]?.axisValueLabel ?? ''}</div>
            ${rows}${totalRow}
          </div>`;
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: mode !== 'line',
        data: labels,
        axisLabel: {
          color: labelColor,
          fontFamily: chartFont,
          fontSize: 10,
          hideOverlap: true,
        },
        axisLine: { lineStyle: { color: axisLineColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        minInterval: 1,
        splitNumber: 4,
        axisLabel: { color: labelColor, fontFamily: chartFont, fontSize: 10 },
        splitLine: {
          lineStyle: { color: splitLineColor, type: 'dashed' as const },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        buildSeries(primaryLabel, primary, primaryColor, true),
        buildSeries(secondaryLabel, secondary, secondaryColor, false),
      ],
    };
  }, [theme, labels, primary, secondary, primaryLabel, secondaryLabel, mode]);

  const rangeIndex = RANGE_OPTIONS.findIndex((r) => r.key === range);
  const modeIndex = (['stack', 'bar', 'line'] as ChartMode[]).indexOf(mode);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="sparkline-detail-title"
      // Portal'd dialog clicks still bubble through React tree to ancestor SparklineButton.
      onClick={(e) => e.stopPropagation()}
      PaperProps={{
        sx: (t) => ({
          backgroundColor: t.palette.background.default,
          backgroundImage: 'none',
          border: `1px solid ${t.palette.border.light}`,
          borderRadius: 2.5,
        }),
      }}
    >
      <DialogTitle
        id="sparkline-detail-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pr: 1,
          py: 1.75,
        }}
      >
        <Avatar
          src={getRepositoryOwnerAvatarSrc(username)}
          alt={username}
          sx={(t) => ({
            width: 36,
            height: 36,
            border: `1px solid ${t.palette.border.medium}`,
          })}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h6"
            component="span"
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {username}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.7rem',
              color: alpha(theme.palette.text.primary, 0.55),
              fontFamily: '"JetBrains Mono", monospace',
              lineHeight: 1.2,
            }}
          >
            Activity · {activeRange.label} window ·{' '}
            {totalPrimary.toLocaleString()} merged PR
            {totalPrimary === 1 ? '' : 's'}
            {totalSecondary > 0
              ? ` · ${totalSecondary.toLocaleString()} issue${
                  totalSecondary === 1 ? '' : 's'
                } solved`
              : ''}
          </Typography>
        </Box>
        <IconButton
          aria-label="close activity chart"
          onClick={onClose}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0.5, pb: 2.5 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <StatTile
            label={primaryLabel}
            value={totalPrimary.toLocaleString()}
            caption="merged PRs"
            accentColor={LEADERBOARD_TRACK_COLORS.oss}
          />
          <StatTile
            label={secondaryLabel}
            value={totalSecondary.toLocaleString()}
            caption="issues solved"
            accentColor={LEADERBOARD_TRACK_COLORS.discovery}
          />
          <StatTile
            label="Max"
            value={peak.total > 0 ? peak.total.toLocaleString() : '—'}
            caption={peak.total > 0 ? peak.label : 'no activity'}
          />
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 1.25 }}
        >
          <ToggleButtonGroup
            value={range}
            exclusive
            size="small"
            onChange={(_, v: RangeKey | null) => v && setRange(v)}
            aria-label="Range"
            sx={capsuleToggleSx(theme, RANGE_OPTIONS.length, rangeIndex)}
          >
            {RANGE_OPTIONS.map(({ key, label }) => (
              <ToggleButton key={key} value={key}>
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={mode}
            exclusive
            size="small"
            onChange={(_, v: ChartMode | null) => v && setMode(v)}
            aria-label="Chart format"
            sx={capsuleToggleSx(theme, 3, modeIndex)}
          >
            <Tooltip
              title="Stacked bars"
              arrow
              placement="top"
              slotProps={tooltipSlotProps}
            >
              <ToggleButton value="stack" aria-label="Stacked bars">
                <StackedBarChartIcon sx={{ fontSize: 16 }} />
              </ToggleButton>
            </Tooltip>
            <Tooltip
              title="Grouped bars"
              arrow
              placement="top"
              slotProps={tooltipSlotProps}
            >
              <ToggleButton value="bar" aria-label="Grouped bars">
                <BarChartIcon sx={{ fontSize: 16 }} />
              </ToggleButton>
            </Tooltip>
            <Tooltip
              title="Line chart"
              arrow
              placement="top"
              slotProps={tooltipSlotProps}
            >
              <ToggleButton value="line" aria-label="Line chart">
                <ShowChartIcon sx={{ fontSize: 16 }} />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Stack>

        <Box
          sx={(t) => ({
            width: '100%',
            height: 170,
            borderRadius: 2,
            border: `1px solid ${t.palette.border.subtle}`,
            backgroundColor: alpha(t.palette.text.primary, 0.02),
            p: 1,
            position: 'relative',
          })}
        >
          {grandTotal === 0 ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              spacing={0.5}
              sx={{ height: '100%', textAlign: 'center' }}
            >
              <Typography
                sx={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: alpha(theme.palette.text.primary, 0.7),
                }}
              >
                No activity in this window
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: alpha(theme.palette.text.primary, 0.45),
                }}
              >
                Try a wider range or check back later.
              </Typography>
            </Stack>
          ) : (
            <ReactECharts
              option={chartOption}
              style={{ width: '100%', height: '100%' }}
              opts={{ renderer: 'svg' }}
              // notMerge prevents stale path data on line ↔ bar swaps.
              notMerge
            />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SparklineDetailModal;
