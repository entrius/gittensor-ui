import React, { useMemo, useState } from 'react';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
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

interface ContributionTrendsProps {
  range: TrendTimeRange;
  labels: string[];
  series: DashboardTrendSeries[];
  isLoading?: boolean;
  onRangeChange: (range: TrendTimeRange) => void;
}

type TrendChartMode = 'line' | 'bar';

const TREND_CHART_ANIMATION_MS = 450;
const TREND_CHART_AXIS_POINTER_WIDTH = 1;
const TREND_CHART_AXIS_POINTER_OPACITY = 0.18;
const TREND_CHART_AXIS_SHADOW_OPACITY = 0.04;
const TREND_CHART_TOOLTIP_PADDING = [10, 12] as const;
const TREND_CHART_TOOLTIP_FONT_SIZE = 11;
const TREND_CHART_AXIS_LABEL_FONT_SIZE = 10;
const TREND_CHART_Y_AXIS_SPLIT_COUNT = 4;
const TREND_CHART_LINE_SMOOTHNESS = 0.2;

const TREND_BAR_MAX_WIDTH = 18;
const TREND_BAR_GAP = '24%';
const TREND_BAR_CATEGORY_GAP = '36%';
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

const CHART_MODE_TOGGLE_PADDING = 0.25;
const CHART_MODE_TOGGLE_BORDER_OPACITY = 0.08;
const CHART_MODE_TOGGLE_BACKGROUND_OPACITY = 0.035;
const CHART_MODE_TOGGLE_SLIDER_INSET = 3;
const CHART_MODE_TOGGLE_SLIDER_WIDTH = `calc(50% - ${CHART_MODE_TOGGLE_SLIDER_INSET}px)`;
const CHART_MODE_TOGGLE_SLIDER_OPACITY = 0.95;

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
  }
> = {
  mergedPrs: {
    label: 'Merged PRs',
    colorOpacity: 0.95,
    lineWidth: 3,
    lineOpacity: 1,
  },
  issuesResolved: {
    label: 'Issues Resolved',
    colorOpacity: 0.85,
    lineWidth: 2.5,
    lineOpacity: 0.9,
  },
  prsOpened: {
    label: 'PRs Opened',
    colorOpacity: 0.35,
    lineWidth: 1.75,
    lineOpacity: 0.6,
  },
  issuesOpened: {
    label: 'Issues Opened',
    colorOpacity: 0.3,
    lineWidth: 1.5,
    lineOpacity: 0.5,
  },
};

const getTrendSeriesBaseColor = (theme: Theme, seriesKey: TrendSeriesKey) =>
  seriesKey === 'mergedPrs' || seriesKey === 'prsOpened'
    ? theme.palette.diff.additions
    : theme.palette.status.award;

const getTrendSeriesColor = (theme: Theme, seriesKey: TrendSeriesKey) =>
  alpha(
    getTrendSeriesBaseColor(theme, seriesKey),
    TREND_SERIES_PRESENTATION[seriesKey].colorOpacity,
  );

const getTrendSeriesBarFill = (theme: Theme, seriesKey: TrendSeriesKey) => {
  const baseColor = getTrendSeriesBaseColor(theme, seriesKey);

  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: TREND_BAR_GRADIENT_STOPS.map((stop) => ({
      offset: stop.offset,
      color: alpha(baseColor, stop.opacity),
    })),
  };
};

const getTrendBarShadowBlur = (seriesKey: TrendSeriesKey) =>
  seriesKey === 'mergedPrs'
    ? TREND_BAR_PRIMARY_SHADOW_BLUR
    : TREND_BAR_SECONDARY_SHADOW_BLUR;

const getChartModeSliderOffset = (chartMode: TrendChartMode) =>
  chartMode === 'bar' ? 'translateX(100%)' : 'translateX(0)';

const getChartModeToggleSx = (theme: Theme, chartMode: TrendChartMode) => ({
  position: 'relative',
  gap: 0,
  p: CHART_MODE_TOGGLE_PADDING,
  borderRadius: '50px',
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
    borderRadius: '50px',
    backgroundColor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.diff.additions, CHART_MODE_TOGGLE_SLIDER_OPACITY)
        : theme.palette.status.success,
    boxShadow: `0 4px 12px ${alpha(
      theme.palette.mode === 'dark'
        ? theme.palette.diff.additions
        : theme.palette.status.success,
      0.3,
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

const buildContributionTrendChartOption = ({
  chartMode,
  labels,
  range,
  theme,
  visibleSeries,
}: {
  chartMode: TrendChartMode;
  labels: string[];
  range: TrendTimeRange;
  theme: Theme;
  visibleSeries: DashboardTrendSeries[];
}) => {
  const labelInterval = range === '35d' ? 6 : range === '7d' ? 0 : 'auto';
  const isDark = theme.palette.mode === 'dark';
  const tooltipLabelColor = isDark
    ? alpha(theme.palette.text.primary, 0.6)
    : theme.palette.text.secondary;
  const tooltipValueColor = theme.palette.text.primary;
  const tooltipDateColor = isDark
    ? theme.palette.text.primary
    : theme.palette.text.secondary;
  const chartFontFamily = echartsFontFamily(theme);
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
          value: number;
        }>,
      ) => {
        const rows = params
          .map(
            (entry) =>
              `<div style="display:flex;justify-content:space-between;gap:24px;align-items:baseline;">
                <span style="color:${tooltipLabelColor};font-size:10px;">${entry.seriesName}</span>
                <span style="color:${tooltipValueColor};font-weight:700;">${entry.value}</span>
              </div>`,
          )
          .join('');

        const divider = `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : theme.palette.border.subtle}`;
        return `
          <div style="display:grid;gap:5px;font-family:${chartFontFamily};">
            <div style="color:${tooltipDateColor};font-weight:600;font-size:11px;padding-bottom:4px;border-bottom:${divider};margin-bottom:1px;">${params[0]?.axisValueLabel || ''}</div>
            ${rows}
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
    series: visibleSeries.map((entry) => {
      const presentation = TREND_SERIES_PRESENTATION[entry.key];
      const color = getTrendSeriesColor(theme, entry.key);

      if (chartMode === 'bar') {
        return {
          name: presentation.label,
          type: 'bar',
          data: entry.values,
          barMaxWidth: TREND_BAR_MAX_WIDTH,
          barGap: TREND_BAR_GAP,
          barCategoryGap: TREND_BAR_CATEGORY_GAP,
          showBackground: true,
          backgroundStyle: {
            color: alpha(
              theme.palette.text.primary,
              TREND_BAR_BACKGROUND_OPACITY,
            ),
            borderRadius: TREND_BAR_RADIUS,
          },
          itemStyle: {
            color: getTrendSeriesBarFill(theme, entry.key),
            borderRadius: TREND_BAR_RADIUS,
            opacity: presentation.lineOpacity,
            shadowBlur: getTrendBarShadowBlur(entry.key),
            shadowColor: alpha(
              getTrendSeriesBaseColor(theme, entry.key),
              TREND_BAR_SHADOW_OPACITY,
            ),
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              opacity: 1,
              shadowBlur: TREND_BAR_HOVER_SHADOW_BLUR,
              shadowColor: alpha(
                getTrendSeriesBaseColor(theme, entry.key),
                TREND_BAR_HOVER_SHADOW_OPACITY,
              ),
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
        data: entry.values,
        lineStyle: {
          width: presentation.lineWidth,
          color,
          opacity: presentation.lineOpacity,
        },
        emphasis: {
          focus: 'series',
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

  const visibleSeries = useMemo(
    () => series.filter((entry) => !hiddenSeries.includes(entry.key)),
    [series, hiddenSeries],
  );

  const chartOption = useMemo(() => {
    return buildContributionTrendChartOption({
      chartMode,
      labels,
      range,
      theme,
      visibleSeries,
    });
  }, [chartMode, labels, range, theme, visibleSeries]);

  const handleToggleSeries = (seriesKey: TrendSeriesKey) => {
    setHiddenSeries((current) => {
      if (current.includes(seriesKey)) {
        return current.filter((key) => key !== seriesKey);
      }

      if (current.length >= series.length - 1) {
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
                  color:
                    theme.palette.mode === 'dark'
                      ? theme.palette.background.paper
                      : theme.palette.common.white,
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? alpha(theme.palette.diff.additions, 0.95)
                      : theme.palette.status.success,
                },
                '&.Mui-selected:hover': {
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? alpha(theme.palette.diff.additions, 0.95)
                      : theme.palette.status.success,
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
            {series.map((entry) => {
              const isHidden = hiddenSeries.includes(entry.key);
              const presentation = TREND_SERIES_PRESENTATION[entry.key];
              const seriesColor = getTrendSeriesColor(theme, entry.key);

              return (
                <Stack
                  key={entry.key}
                  direction="row"
                  spacing={0.6}
                  alignItems="center"
                  onClick={() => handleToggleSeries(entry.key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleToggleSeries(entry.key);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  sx={{
                    px: 0.95,
                    py: 0.48,
                    borderRadius: '50px',
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
                      borderColor: alpha(theme.palette.text.primary, 0.14),
                      backgroundColor: alpha(theme.palette.text.primary, 0.03),
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${alpha(theme.palette.diff.additions, 0.38)}`,
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
                </Stack>
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
