import React, { useMemo, useState } from 'react';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, type Theme, useTheme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import {
  type DashboardTrendSeries,
  type TrendSeriesKey,
  type TrendTimeRange,
} from '../dashboardData';
import {
  echartsAxisTooltipChrome,
  echartsFontFamily,
  echartsGridLineChart,
  echartsMutedCartesianAxisColors,
  echartsTransparentBackground,
} from '../../../utils/echarts/gittensorChartTheme';
import { CHART_COLORS } from '../../../theme';

interface ContributionTrendsProps {
  range: TrendTimeRange;
  labels: string[];
  series: DashboardTrendSeries[];
  isLoading?: boolean;
  onRangeChange: (range: TrendTimeRange) => void;
}

type TrendChartMode = 'line' | 'bar';
type TrendBarLayout = 'stacked' | 'grouped';

const TREND_CHART_ANIMATION_MS = 450;
const TREND_SERIES_BLUR_OPACITY = 0.15;
const TREND_SERIES_BLUR_AREA_OPACITY = 0.04;
const TREND_CHART_AXIS_POINTER_WIDTH = 1;
const TREND_CHART_AXIS_POINTER_OPACITY = 0.18;
const TREND_CHART_AXIS_SHADOW_OPACITY = 0.04;
const TREND_CHART_TOOLTIP_PADDING = [10, 12] as const;
const TREND_CHART_TOOLTIP_FONT_SIZE = 11;
const TREND_CHART_AXIS_LABEL_FONT_SIZE = 10;
const TREND_CHART_Y_AXIS_SPLIT_COUNT = 4;
const TREND_CHART_LINE_SMOOTHNESS = 0.2;

const TREND_BAR_MAX_WIDTH = 18;
const TREND_BAR_STACKED_MAX_WIDTH = 22;
const TREND_BAR_GAP = '24%';
const TREND_BAR_CATEGORY_GAP = '36%';
const TREND_BAR_STACKED_CATEGORY_GAP = '32%';
const TREND_BAR_RADIUS = [5, 5, 0, 0] as const;
const TREND_BAR_BACKGROUND_OPACITY = 0.035;
const TREND_BAR_SHADOW_OPACITY = 0.2;
const TREND_BAR_HOVER_SHADOW_OPACITY = 0.32;
const TREND_BAR_PRIMARY_SHADOW_BLUR = 8;
const TREND_BAR_SECONDARY_SHADOW_BLUR = 4;
const TREND_BAR_HOVER_SHADOW_BLUR = 12;
const TREND_BAR_GRADIENT_STOPS = [
  { offset: 0, opacity: 0.95 },
  { offset: 0.55, opacity: 0.68 },
  { offset: 1, opacity: 0.22 },
] as const;
const TREND_BAR_STACKED_GRADIENT_STOPS = [
  { offset: 0, opacity: 0.95 },
  { offset: 1, opacity: 0.78 },
] as const;

const TREND_LINE_AREA_GRADIENT_STOPS = [
  { offset: 0, opacity: 0.32 },
  { offset: 1, opacity: 0 },
] as const;

const CHART_MODE_TOGGLE_PADDING = 0.25;
const CHART_MODE_TOGGLE_BORDER_OPACITY = 0.08;
const CHART_MODE_TOGGLE_BACKGROUND_OPACITY = 0.035;
const CHART_MODE_TOGGLE_SLIDER_INSET = 3;
const CHART_MODE_TOGGLE_SLIDER_WIDTH = `calc(50% - ${CHART_MODE_TOGGLE_SLIDER_INSET}px)`;
const CHART_MODE_TOGGLE_SLIDER_OPACITY = 0.95;
const CHART_MODE_TOGGLE_SLIDER_SHADOW_OPACITY = 0.16;
const CHART_MODE_TOGGLE_TRANSITION =
  'transform 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease';
const CHART_MODE_TOGGLE_BUTTON_SIZE = {
  width: 36,
  height: 26,
} as const;
const CHART_MODE_TOGGLE_IDLE_TEXT_OPACITY = 0.58;

const TREND_SERIES_PRESENTATION: Record<
  TrendSeriesKey,
  {
    label: string;
    colorOpacity: number;
    lineWidth: number;
    lineOpacity: number;
    areaOpacity: number;
  }
> = {
  mergedPrs: {
    label: 'Merged PRs',
    colorOpacity: 0.95,
    lineWidth: 3,
    lineOpacity: 1,
    areaOpacity: 0.45,
  },
  issuesResolved: {
    label: 'Issues Resolved',
    colorOpacity: 0.9,
    lineWidth: 2.5,
    lineOpacity: 0.95,
    areaOpacity: 0.4,
  },
  prsOpened: {
    label: 'PRs Opened',
    colorOpacity: 0.85,
    lineWidth: 2,
    lineOpacity: 0.9,
    areaOpacity: 0.32,
  },
  issuesOpened: {
    label: 'Issues Opened',
    colorOpacity: 0.8,
    lineWidth: 1.75,
    lineOpacity: 0.85,
    areaOpacity: 0.28,
  },
};

const TREND_SERIES_ORDER: TrendSeriesKey[] = [
  'mergedPrs',
  'issuesResolved',
  'prsOpened',
  'issuesOpened',
];

const getTrendSeriesBaseColor = (theme: Theme, seriesKey: TrendSeriesKey) => {
  switch (seriesKey) {
    case 'mergedPrs':
      return theme.palette.diff.additions;
    case 'issuesResolved':
      return theme.palette.status.award;
    case 'prsOpened':
      return theme.palette.status.info;
    case 'issuesOpened':
      return CHART_COLORS.series[3];
  }
};

const getTrendSeriesColor = (theme: Theme, seriesKey: TrendSeriesKey) =>
  alpha(
    getTrendSeriesBaseColor(theme, seriesKey),
    TREND_SERIES_PRESENTATION[seriesKey].colorOpacity,
  );

const getTrendSeriesBarFill = (
  theme: Theme,
  seriesKey: TrendSeriesKey,
  barLayout: TrendBarLayout,
) => {
  const baseColor = getTrendSeriesBaseColor(theme, seriesKey);
  const stops =
    barLayout === 'stacked'
      ? TREND_BAR_STACKED_GRADIENT_STOPS
      : TREND_BAR_GRADIENT_STOPS;

  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: stops.map((stop) => ({
      offset: stop.offset,
      color: alpha(baseColor, stop.opacity),
    })),
  };
};

const getTrendSeriesAreaFill = (theme: Theme, seriesKey: TrendSeriesKey) => {
  const baseColor = getTrendSeriesBaseColor(theme, seriesKey);

  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: TREND_LINE_AREA_GRADIENT_STOPS.map((stop) => ({
      offset: stop.offset,
      color: alpha(baseColor, stop.opacity),
    })),
  };
};

const formatTrendSeriesTotal = (total: number) => {
  if (total >= 1000) {
    const compact = total / 1000;
    return `${compact >= 10 ? Math.round(compact) : compact.toFixed(1)}k`;
  }
  return total.toLocaleString();
};

const getTrendBarShadowBlur = (seriesKey: TrendSeriesKey) =>
  seriesKey === 'mergedPrs'
    ? TREND_BAR_PRIMARY_SHADOW_BLUR
    : TREND_BAR_SECONDARY_SHADOW_BLUR;

const getChartModeSliderOffset = (chartMode: TrendChartMode) =>
  chartMode === 'bar' ? 'translateX(100%)' : 'translateX(0)';

const getBarLayoutSliderOffset = (barLayout: TrendBarLayout) =>
  barLayout === 'grouped' ? 'translateX(100%)' : 'translateX(0)';

const getChartModeToggleSx = (theme: Theme, chartMode: TrendChartMode) => ({
  position: 'relative',
  gap: 0,
  p: CHART_MODE_TOGGLE_PADDING,
  borderRadius: 999,
  border: `1px solid ${alpha(
    theme.palette.text.primary,
    CHART_MODE_TOGGLE_BORDER_OPACITY,
  )}`,
  backgroundColor: alpha(
    theme.palette.text.primary,
    CHART_MODE_TOGGLE_BACKGROUND_OPACITY,
  ),
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: CHART_MODE_TOGGLE_SLIDER_INSET,
    bottom: CHART_MODE_TOGGLE_SLIDER_INSET,
    left: CHART_MODE_TOGGLE_SLIDER_INSET,
    width: CHART_MODE_TOGGLE_SLIDER_WIDTH,
    borderRadius: 999,
    backgroundColor: alpha(
      theme.palette.diff.additions,
      CHART_MODE_TOGGLE_SLIDER_OPACITY,
    ),
    boxShadow: `0 8px 18px ${alpha(
      theme.palette.diff.additions,
      CHART_MODE_TOGGLE_SLIDER_SHADOW_OPACITY,
    )}`,
    transform: getChartModeSliderOffset(chartMode),
    transition: CHART_MODE_TOGGLE_TRANSITION,
  },
  '& .MuiToggleButtonGroup-grouped': {
    zIndex: 1,
    border: 0,
    borderRadius: '999px !important',
    px: 0,
    py: 0,
    minWidth: CHART_MODE_TOGGLE_BUTTON_SIZE.width,
    width: CHART_MODE_TOGGLE_BUTTON_SIZE.width,
    height: CHART_MODE_TOGGLE_BUTTON_SIZE.height,
    color: alpha(
      theme.palette.text.primary,
      CHART_MODE_TOGGLE_IDLE_TEXT_OPACITY,
    ),
    fontSize: '0.66rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    '&.Mui-selected': {
      color: theme.palette.background.paper,
      backgroundColor: 'transparent',
    },
    '&.Mui-selected:hover': {
      backgroundColor: 'transparent',
    },
    '&:hover': {
      backgroundColor: 'transparent',
      color: theme.palette.text.primary,
    },
  },
});

const getBarLayoutToggleSx = (theme: Theme, barLayout: TrendBarLayout) => ({
  ...getChartModeToggleSx(theme, 'line'),
  '&::before': {
    ...getChartModeToggleSx(theme, 'line')['&::before'],
    transform: getBarLayoutSliderOffset(barLayout),
  },
});

const buildContributionTrendChartOption = ({
  chartMode,
  barLayout,
  labels,
  range,
  theme,
  visibleSeries,
}: {
  chartMode: TrendChartMode;
  barLayout: TrendBarLayout;
  labels: string[];
  range: TrendTimeRange;
  theme: Theme;
  visibleSeries: DashboardTrendSeries[];
}) => {
  const labelInterval = range === '35d' ? 6 : range === '7d' ? 0 : 'auto';
  const tooltipPrimaryColor = theme.palette.text.primary;
  const tooltipSecondaryColor = alpha(theme.palette.text.primary, 0.66);
  const tooltipDividerColor = alpha(theme.palette.text.primary, 0.1);
  const chartFontFamily = echartsFontFamily(theme);
  const showStackedTotal =
    chartMode === 'bar' && barLayout === 'stacked' && visibleSeries.length > 1;
  const tooltipDotColors = visibleSeries.map((entry) =>
    getTrendSeriesColor(theme, entry.key),
  );
  const {
    labelColor: chartLabelColor,
    axisLineColor: chartAxisLineColor,
    splitLineColor: chartSplitLineColor,
  } = echartsMutedCartesianAxisColors(theme);

  return {
    ...echartsTransparentBackground(),
    animationDuration: TREND_CHART_ANIMATION_MS,
    color: visibleSeries.map((entry) => getTrendSeriesColor(theme, entry.key)),
    tooltip: {
      trigger: 'axis',
      confine: true,
      appendTo: () => document.body,
      axisPointer: {
        type: chartMode === 'bar' ? 'shadow' : 'line',
        lineStyle: {
          color: alpha(
            theme.palette.text.primary,
            TREND_CHART_AXIS_POINTER_OPACITY,
          ),
          width: TREND_CHART_AXIS_POINTER_WIDTH,
        },
        shadowStyle: {
          color: alpha(
            theme.palette.text.primary,
            TREND_CHART_AXIS_SHADOW_OPACITY,
          ),
        },
      },
      ...echartsAxisTooltipChrome(theme),
      padding: TREND_CHART_TOOLTIP_PADDING,
      textStyle: {
        color: theme.palette.text.primary,
        fontFamily: chartFontFamily,
        fontSize: TREND_CHART_TOOLTIP_FONT_SIZE,
      },
      formatter: (
        params: Array<{
          axisValueLabel: string;
          seriesName: string;
          seriesIndex: number;
          value: number;
        }>,
      ) => {
        const rows = params
          .map((entry) => {
            const value = entry.value ?? 0;
            const dotColor =
              tooltipDotColors[entry.seriesIndex] ?? tooltipPrimaryColor;
            const colorDot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${dotColor};margin-right:8px;flex-shrink:0;"></span>`;
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;">
                <span style="display:inline-flex;align-items:center;color:${tooltipSecondaryColor};">${colorDot}${entry.seriesName}</span>
                <span style="color:${tooltipPrimaryColor};font-weight:700;">${value}</span>
              </div>`;
          })
          .join('');

        const total = params.reduce(
          (sum, entry) => sum + (entry.value ?? 0),
          0,
        );
        const totalRow =
          showStackedTotal || params.length > 1
            ? `
              <div style="margin-top:4px;padding-top:6px;border-top:1px solid ${tooltipDividerColor};display:flex;align-items:center;justify-content:space-between;gap:24px;">
                <span style="color:${tooltipPrimaryColor};font-weight:700;letter-spacing:0.04em;text-transform:uppercase;font-size:10px;">Total</span>
                <span style="color:${tooltipPrimaryColor};font-weight:700;">${total}</span>
              </div>`
            : '';

        return `
          <div style="display:grid;gap:6px;font-family:${chartFontFamily};min-width:160px;">
            <div style="color:${tooltipPrimaryColor};font-weight:700;">${params[0]?.axisValueLabel || ''}</div>
            ${rows}
            ${totalRow}
          </div>
        `;
      },
    },
    grid: echartsGridLineChart(),
    xAxis: {
      type: 'category',
      boundaryGap: chartMode === 'bar',
      data: labels,
      axisLabel: {
        color: chartLabelColor,
        fontFamily: chartFontFamily,
        fontSize: TREND_CHART_AXIS_LABEL_FONT_SIZE,
        interval: labelInterval,
        hideOverlap: true,
      },
      axisLine: {
        lineStyle: {
          color: chartAxisLineColor,
        },
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      splitNumber: TREND_CHART_Y_AXIS_SPLIT_COUNT,
      axisLabel: {
        color: chartLabelColor,
        fontFamily: chartFontFamily,
        fontSize: TREND_CHART_AXIS_LABEL_FONT_SIZE,
      },
      splitLine: {
        lineStyle: {
          color: chartSplitLineColor,
          type: 'dashed',
        },
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: visibleSeries.map((entry, index) => {
      const presentation = TREND_SERIES_PRESENTATION[entry.key];
      const color = getTrendSeriesColor(theme, entry.key);

      if (chartMode === 'bar') {
        const stacked = barLayout === 'stacked';
        const isTopOfStack = stacked && index === visibleSeries.length - 1;
        const stackedRadius = isTopOfStack ? TREND_BAR_RADIUS : 0;

        return {
          name: presentation.label,
          type: 'bar',
          data: entry.values,
          stack: stacked ? 'total' : undefined,
          barMaxWidth: stacked
            ? TREND_BAR_STACKED_MAX_WIDTH
            : TREND_BAR_MAX_WIDTH,
          barGap: stacked ? 0 : TREND_BAR_GAP,
          barCategoryGap: stacked
            ? TREND_BAR_STACKED_CATEGORY_GAP
            : TREND_BAR_CATEGORY_GAP,
          showBackground: !stacked,
          backgroundStyle: {
            color: alpha(
              theme.palette.text.primary,
              TREND_BAR_BACKGROUND_OPACITY,
            ),
            borderRadius: TREND_BAR_RADIUS,
          },
          itemStyle: {
            color: getTrendSeriesBarFill(theme, entry.key, barLayout),
            borderRadius: stacked ? stackedRadius : TREND_BAR_RADIUS,
            opacity: presentation.lineOpacity,
            shadowBlur: stacked ? 0 : getTrendBarShadowBlur(entry.key),
            shadowColor: alpha(
              getTrendSeriesBaseColor(theme, entry.key),
              TREND_BAR_SHADOW_OPACITY,
            ),
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              opacity: 1,
              shadowBlur: stacked ? 0 : TREND_BAR_HOVER_SHADOW_BLUR,
              shadowColor: alpha(
                getTrendSeriesBaseColor(theme, entry.key),
                TREND_BAR_HOVER_SHADOW_OPACITY,
              ),
            },
          },
          blur: {
            itemStyle: {
              opacity: TREND_SERIES_BLUR_OPACITY,
            },
          },
        };
      }

      return {
        name: presentation.label,
        type: 'line',
        smooth: TREND_CHART_LINE_SMOOTHNESS,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 6,
        data: entry.values,
        lineStyle: {
          width: presentation.lineWidth,
          color,
          opacity: presentation.lineOpacity,
        },
        areaStyle: {
          color: getTrendSeriesAreaFill(theme, entry.key),
          opacity: presentation.areaOpacity,
        },
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: presentation.lineWidth + 0.5,
          },
        },
        blur: {
          lineStyle: {
            opacity: TREND_SERIES_BLUR_OPACITY,
          },
          areaStyle: {
            opacity: TREND_SERIES_BLUR_AREA_OPACITY,
          },
        },
      };
    }),
  };
};

const ContributionTrends: React.FC<ContributionTrendsProps> = ({
  range,
  labels,
  series,
  isLoading = false,
  onRangeChange,
}) => {
  const theme = useTheme();
  const [hiddenSeries, setHiddenSeries] = useState<TrendSeriesKey[]>([]);
  const [chartMode, setChartMode] = useState<TrendChartMode>('line');
  const [barLayout, setBarLayout] = useState<TrendBarLayout>('stacked');

  const orderedSeries = useMemo(() => {
    const byKey = new Map(series.map((entry) => [entry.key, entry] as const));
    return TREND_SERIES_ORDER.flatMap((key) => {
      const entry = byKey.get(key);
      return entry ? [entry] : [];
    });
  }, [series]);

  const visibleSeries = useMemo(
    () => orderedSeries.filter((entry) => !hiddenSeries.includes(entry.key)),
    [orderedSeries, hiddenSeries],
  );

  const seriesTotals = useMemo(() => {
    const totals: Partial<Record<TrendSeriesKey, number>> = {};
    for (const entry of orderedSeries) {
      totals[entry.key] = entry.values.reduce(
        (sum, value) => sum + (value ?? 0),
        0,
      );
    }
    return totals;
  }, [orderedSeries]);

  const hasAnyActivity = useMemo(
    () =>
      orderedSeries.some((entry) =>
        entry.values.some((value) => (value ?? 0) > 0),
      ),
    [orderedSeries],
  );

  const chartOption = useMemo(() => {
    return buildContributionTrendChartOption({
      chartMode,
      barLayout,
      labels,
      range,
      theme,
      visibleSeries,
    });
  }, [chartMode, barLayout, labels, range, theme, visibleSeries]);

  const handleToggleSeries = (seriesKey: TrendSeriesKey, soloMode = false) => {
    const otherKeys = orderedSeries
      .map((entry) => entry.key)
      .filter((key) => key !== seriesKey);

    setHiddenSeries((current) => {
      if (soloMode) {
        const isAlreadySolo =
          !current.includes(seriesKey) &&
          otherKeys.every((key) => current.includes(key));
        return isAlreadySolo ? [] : otherKeys;
      }

      if (current.includes(seriesKey)) {
        return current.filter((key) => key !== seriesKey);
      }

      if (current.length >= orderedSeries.length - 1) {
        return current;
      }

      return [...current, seriesKey];
    });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 1.15, md: 1.5 }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 1.1 }}
      >
        <Box>
          <Typography
            sx={{
              color: theme.palette.text.primary,
              fontSize: { xs: '1.02rem', sm: '1.1rem' },
              fontWeight: 700,
            }}
          >
            Active Network
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          flexWrap="wrap"
          justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
        >
          <ToggleButtonGroup
            exclusive
            value={chartMode}
            onChange={(
              _event: React.MouseEvent<HTMLElement>,
              nextMode: TrendChartMode | null,
            ) => {
              if (nextMode) setChartMode(nextMode);
            }}
            size="small"
            aria-label="Contribution timeline chart mode"
            sx={getChartModeToggleSx(theme, chartMode)}
          >
            <ToggleButton
              value="line"
              aria-label="Line chart"
              title="Line chart"
            >
              <ShowChartIcon fontSize="inherit" />
            </ToggleButton>
            <ToggleButton value="bar" aria-label="Bar chart" title="Bar chart">
              <BarChartIcon fontSize="inherit" />
            </ToggleButton>
          </ToggleButtonGroup>

          {chartMode === 'bar' && (
            <ToggleButtonGroup
              exclusive
              value={barLayout}
              onChange={(
                _event: React.MouseEvent<HTMLElement>,
                nextLayout: TrendBarLayout | null,
              ) => {
                if (nextLayout) setBarLayout(nextLayout);
              }}
              size="small"
              aria-label="Bar chart layout"
              sx={getBarLayoutToggleSx(theme, barLayout)}
            >
              <ToggleButton
                value="stacked"
                aria-label="Stacked bars"
                title="Stacked bars — total network activity"
              >
                <StackedBarChartIcon fontSize="inherit" />
              </ToggleButton>
              <ToggleButton
                value="grouped"
                aria-label="Grouped bars"
                title="Grouped bars — compare side-by-side"
              >
                <ViewColumnIcon fontSize="inherit" />
              </ToggleButton>
            </ToggleButtonGroup>
          )}

          <ToggleButtonGroup
            exclusive
            value={range}
            onChange={(
              _event: React.MouseEvent<HTMLElement>,
              nextRange: TrendTimeRange | null,
            ) => {
              if (nextRange) onRangeChange(nextRange);
            }}
            size="small"
            aria-label="Contribution timeline time range"
            sx={{
              gap: 0.18,
              '& .MuiToggleButtonGroup-grouped': {
                border: 0,
                borderRadius: '999px !important',
                px: 0.8,
                py: 0.24,
                minWidth: 38,
                color: alpha(theme.palette.text.primary, 0.58),
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                '&.Mui-selected': {
                  color: theme.palette.background.paper,
                  backgroundColor: alpha(theme.palette.diff.additions, 0.95),
                },
                '&.Mui-selected:hover': {
                  backgroundColor: alpha(theme.palette.diff.additions, 0.95),
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.text.primary, 0.06),
                },
              },
            }}
          >
            <ToggleButton value="1d">1D</ToggleButton>
            <ToggleButton value="7d">7D</ToggleButton>
            <ToggleButton value="35d">35D</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.border.light}`,
          backgroundColor: 'transparent',
        }}
      >
        <CardContent
          sx={{
            p: { xs: 1.35, sm: 1.5 },
            '&:last-child': { pb: { xs: 1.35, sm: 1.5 } },
          }}
        >
          <Stack
            direction="row"
            spacing={0.8}
            useFlexGap
            flexWrap="wrap"
            sx={{ mb: 1.1 }}
          >
            {orderedSeries.map((entry) => {
              const isHidden = hiddenSeries.includes(entry.key);
              const presentation = TREND_SERIES_PRESENTATION[entry.key];
              const seriesColor = getTrendSeriesColor(theme, entry.key);
              const total = seriesTotals[entry.key] ?? 0;

              return (
                <Tooltip
                  key={entry.key}
                  title="Click to toggle · Shift-click to solo"
                  placement="top"
                  arrow
                  enterDelay={400}
                >
                  <Stack
                    direction="row"
                    spacing={0.7}
                    alignItems="center"
                    onClick={(event) =>
                      handleToggleSeries(entry.key, event.shiftKey)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleToggleSeries(entry.key, event.shiftKey);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={!isHidden}
                    sx={{
                      px: 0.95,
                      py: 0.48,
                      borderRadius: 999,
                      border: isHidden
                        ? `1px solid ${theme.palette.border.subtle}`
                        : `1px solid ${theme.palette.border.light}`,
                      backgroundColor: isHidden
                        ? 'transparent'
                        : theme.palette.surface.subtle,
                      cursor: 'pointer',
                      opacity: isHidden ? 0.55 : 1,
                      transition:
                        'opacity 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
                      '&:hover': {
                        borderColor: alpha(seriesColor, 0.5),
                        backgroundColor: alpha(seriesColor, 0.06),
                      },
                      '&:focus-visible': {
                        outline: `2px solid ${alpha(seriesColor, 0.5)}`,
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: seriesColor,
                        boxShadow: `0 0 0 1px ${seriesColor}`,
                        opacity: isHidden ? 0.35 : presentation.lineOpacity,
                      }}
                    />
                    <Typography
                      sx={{
                        color: isHidden
                          ? alpha(theme.palette.text.primary, 0.46)
                          : alpha(theme.palette.text.primary, 0.72),
                        fontSize: '0.72rem',
                        lineHeight: 1,
                      }}
                    >
                      {presentation.label}
                    </Typography>
                    <Typography
                      sx={{
                        color: isHidden
                          ? alpha(theme.palette.text.primary, 0.32)
                          : alpha(theme.palette.text.primary, 0.92),
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1,
                        ml: 0.2,
                      }}
                    >
                      {formatTrendSeriesTotal(total)}
                    </Typography>
                  </Stack>
                </Tooltip>
              );
            })}
          </Stack>

          <Box
            sx={{
              width: '100%',
              height: 280,
              '& > div': {
                width: '100%',
                height: '100%',
              },
            }}
          >
            {isLoading ? (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircularProgress size={28} />
              </Box>
            ) : !hasAnyActivity ? (
              <Stack
                spacing={0.6}
                alignItems="center"
                justifyContent="center"
                sx={{
                  width: '100%',
                  height: '100%',
                  textAlign: 'center',
                  px: 2,
                }}
              >
                <Typography
                  sx={{
                    color: alpha(theme.palette.text.primary, 0.78),
                    fontSize: '0.92rem',
                    fontWeight: 700,
                  }}
                >
                  No network activity in this range
                </Typography>
                <Typography
                  sx={{
                    color: alpha(theme.palette.text.primary, 0.5),
                    fontSize: '0.78rem',
                    maxWidth: 360,
                  }}
                >
                  Try a wider time range, or check back once new PRs and issues
                  flow in.
                </Typography>
              </Stack>
            ) : (
              <ReactECharts
                option={chartOption}
                notMerge={true}
                style={{ width: '100%', height: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ContributionTrends;
