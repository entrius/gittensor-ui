import React, { useMemo, useState } from 'react';
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

interface ContributionTrendsProps {
  range: TrendTimeRange;
  labels: string[];
  series: DashboardTrendSeries[];
  isLoading?: boolean;
  onRangeChange: (range: TrendTimeRange) => void;
}

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

const ContributionTrends: React.FC<ContributionTrendsProps> = ({
  range,
  labels,
  series,
  isLoading = false,
  onRangeChange,
}) => {
  const theme = useTheme();
  const [hiddenSeries, setHiddenSeries] = useState<TrendSeriesKey[]>([]);

  const visibleSeries = useMemo(
    () => series.filter((entry) => !hiddenSeries.includes(entry.key)),
    [series, hiddenSeries],
  );

  const chartOption = useMemo(() => {
    const labelInterval = range === '35d' ? 6 : range === '7d' ? 0 : 'auto';
    const tooltipPrimaryColor = theme.palette.text.primary;
    const tooltipSecondaryColor = alpha(theme.palette.text.primary, 0.66);
    const tooltipFontFamily = theme.typography.fontFamily;
    const chartLabelColor = alpha(theme.palette.text.primary, 0.64);
    const chartAxisLineColor = alpha(theme.palette.text.primary, 0.08);
    const chartSplitLineColor = alpha(theme.palette.text.primary, 0.07);
    const chartFontFamily = theme.typography.fontFamily;

    return {
      backgroundColor: 'transparent',
      animationDuration: 450,
      color: visibleSeries.map((series) =>
        getTrendSeriesColor(theme, series.key),
      ),
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: alpha(theme.palette.text.primary, 0.18),
            width: 1,
          },
        },
        backgroundColor: theme.palette.surface.tooltip,
        borderColor: alpha(theme.palette.text.primary, 0.14),
        borderWidth: 1,
        padding: [10, 12],
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: theme.typography.fontFamily,
          fontSize: 11,
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
                `<div style="display:flex;justify-content:space-between;gap:24px;">
                  <span style="color:${tooltipSecondaryColor};">${entry.seriesName}</span>
                  <span style="color:${tooltipPrimaryColor};font-weight:700;">${entry.value}</span>
                </div>`,
            )
            .join('');

          return `
            <div style="display:grid;gap:6px;font-family:${tooltipFontFamily};">
              <div style="color:${tooltipPrimaryColor};font-weight:700;">${params[0]?.axisValueLabel || ''}</div>
              ${rows}
            </div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '2%',
        top: 20,
        bottom: 28,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLabel: {
          color: chartLabelColor,
          fontFamily: chartFontFamily,
          fontSize: 10,
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
        splitNumber: 4,
        axisLabel: {
          color: chartLabelColor,
          fontFamily: chartFontFamily,
          fontSize: 10,
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
      series: visibleSeries.map((series) => ({
        name: TREND_SERIES_PRESENTATION[series.key].label,
        type: 'line',
        smooth: 0.2,
        showSymbol: false,
        symbol: 'circle',
        data: series.values,
        lineStyle: {
          width: TREND_SERIES_PRESENTATION[series.key].lineWidth,
          color: getTrendSeriesColor(theme, series.key),
          opacity: TREND_SERIES_PRESENTATION[series.key].lineOpacity,
        },
        emphasis: {
          focus: 'series',
        },
      })),
    };
  }, [labels, range, theme, visibleSeries]);

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
