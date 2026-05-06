import React from 'react';
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { alpha, type Theme, useTheme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import KpiCard from '../../../components/KpiCard';
import {
  type DashboardKpi,
  type DashboardOverviewPool,
  type DashboardOverviewSection,
  type TrendTimeRange,
} from '../dashboardData';
import {
  echartsFontFamily,
  echartsItemTooltipChrome,
  echartsTransparentBackground,
} from '../../../utils/echarts/gittensorChartTheme';

interface DashboardOverviewProps {
  range: TrendTimeRange;
  sections: DashboardOverviewSection[];
  kpis: DashboardKpi[];
}

const isResolvedMetric = (label: string) =>
  label === 'Merged' || label === 'Solved';

const getSegmentColor = (theme: Theme, label: string): string => {
  if (isResolvedMetric(label)) return theme.palette.diff.additions;
  if (label === 'Closed') return theme.palette.status.closed;
  return theme.palette.status.open;
};

const getMetricTone = (theme: Theme, label: string) => {
  if (label === 'Total') return theme.palette.text.primary;
  if (isResolvedMetric(label)) return theme.palette.status.merged;
  if (label === 'Open') return theme.palette.status.open;
  if (label === 'Closed') return theme.palette.status.closed;
  return theme.palette.text.primary;
};

const getDeltaColor = (theme: Theme, delta: string): string => {
  if (delta.startsWith('+')) return theme.palette.status.success;
  if (delta.startsWith('-')) return theme.palette.status.closed;
  return alpha(theme.palette.text.primary, 0.48);
};

const buildStatusChartOption = (
  theme: Theme,
  centerLabel: string,
  segments: DashboardOverviewPool['chartSegments'],
): Record<string, unknown> => {
  const totalValue = segments.reduce((sum, segment) => sum + segment.value, 0);
  const chartFont = echartsFontFamily(theme);
  const tooltipLabelColor = alpha(theme.palette.text.primary, 0.62);
  const tooltipBorderColor = alpha(theme.palette.text.primary, 0.12);

  return {
    ...echartsTransparentBackground(),
    title: {
      text: centerLabel,
      left: 'center',
      top: '34%',
      textStyle: {
        color: theme.palette.text.primary,
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: chartFont,
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: ({
        name,
        value,
        percent,
        color,
      }: {
        name: string;
        value: number;
        percent: number;
        color?: string;
      }) => `
        <div style="display:grid;gap:7px;min-width:136px;font-family:${chartFont};">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:8px;height:8px;border-radius:999px;background:${color ?? theme.palette.text.secondary};box-shadow:0 0 0 2px ${alpha(theme.palette.text.primary, 0.08)};"></span>
            <span style="color:${theme.palette.text.primary};font-weight:700;">${name}</span>
          </div>
          <div style="border-top:1px solid ${tooltipBorderColor};padding-top:7px;display:grid;gap:5px;">
            <div style="display:flex;justify-content:space-between;gap:18px;">
              <span style="color:${tooltipLabelColor};">Count</span>
              <span style="color:${theme.palette.text.primary};font-weight:700;">${Number(value).toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:18px;">
              <span style="color:${tooltipLabelColor};">Share</span>
              <span style="color:${theme.palette.text.primary};font-weight:700;">${percent}%</span>
            </div>
          </div>
        </div>
      `,
      ...echartsItemTooltipChrome(theme),
    },
    series: [
      {
        name: 'Status Breakdown',
        type: 'pie',
        radius: ['68%', '84%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: theme.palette.background.default,
          borderWidth: 2,
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: false },
          scale: true,
          scaleSize: 3,
        },
        labelLine: { show: false },
        data: segments.map((segment) => ({
          value: segment.value,
          name: segment.label,
          itemStyle: {
            color: getSegmentColor(theme, segment.label),
            opacity: 1,
          },
        })),
      },
      {
        type: 'pie',
        silent: true,
        radius: ['0%', '55%'],
        center: ['50%', '45%'],
        label: { show: false },
        data: [
          {
            value: totalValue || 1,
            itemStyle: { color: theme.palette.background.default },
          },
        ],
        z: 0,
      },
    ],
  };
};

interface PoolColumnProps {
  sectionTitle: string;
  pool: DashboardOverviewPool;
  isEligible: boolean;
}

const PoolColumn: React.FC<PoolColumnProps> = ({
  sectionTitle,
  pool,
  isEligible,
}) => {
  const theme = useTheme();
  const monoFontFamily = theme.typography.fontFamily;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        p: 1,
        borderRadius: 2,
        border: `1px solid ${theme.palette.border.light}`,
      }}
    >
      {/* Pool label — matches MinerCard eligibility badge style */}
      <Typography
        sx={{
          fontFamily: monoFontFamily,
          fontSize: '0.62rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          alignSelf: 'flex-start',
          borderRadius: 1,
          px: 0.75,
          py: 0.2,
          border: `1px solid ${isEligible ? alpha(theme.palette.status.merged, 0.45) : theme.palette.border.subtle}`,
          color: isEligible
            ? theme.palette.status.merged
            : theme.palette.text.secondary,
          backgroundColor: isEligible
            ? alpha(theme.palette.status.merged, 0.08)
            : theme.palette.surface.subtle,
        }}
      >
        {isEligible ? 'Eligible' : 'Not Eligible'}
      </Typography>

      {/* Donut chart */}
      <Box
        sx={{
          width: '100%',
          aspectRatio: '1',
          maxWidth: 90,
          alignSelf: 'center',
          '& > div': { width: '100%', height: '100%' },
        }}
      >
        <ReactECharts
          option={buildStatusChartOption(
            theme,
            pool.chartCenterLabel,
            pool.chartSegments,
          )}
          style={{ width: '100%', height: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </Box>

      {/* Legend */}
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        flexWrap="wrap"
        justifyContent="center"
      >
        {pool.chartSegments.map((segment) => (
          <Stack
            key={`${sectionTitle}-${isEligible}-${segment.label}`}
            direction="row"
            spacing={0.4}
            alignItems="center"
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                flexShrink: 0,
                mt: '1px',
                backgroundColor: getSegmentColor(theme, segment.label),
              }}
            />
            <Typography
              sx={{
                color: alpha(theme.palette.text.primary, 0.55),
                fontFamily: monoFontFamily,
                fontSize: '0.6rem',
                lineHeight: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {segment.label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {/* Metrics */}
      <Stack spacing={0} sx={{ mt: 0.25 }}>
        {pool.metrics.map((metric) => (
          <Box
            key={`${sectionTitle}-${isEligible}-${metric.label}`}
            sx={{
              py: 0.45,
              borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
            >
              <Box>
                <Typography
                  sx={{
                    color: alpha(theme.palette.text.primary, 0.75),
                    fontFamily: monoFontFamily,
                    fontSize: '0.62rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                  }}
                >
                  {metric.label}
                </Typography>
                <Typography
                  sx={{
                    color: isEligible
                      ? getDeltaColor(theme, metric.delta)
                      : alpha(theme.palette.text.primary, 0.25),
                    fontFamily: monoFontFamily,
                    fontSize: '0.62rem',
                  }}
                >
                  {metric.delta}
                </Typography>
              </Box>
              <Typography
                sx={{
                  color: isEligible
                    ? getMetricTone(theme, metric.label)
                    : alpha(theme.palette.text.primary, 0.4),
                  fontFamily: monoFontFamily,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {metric.value.toLocaleString()}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  range,
  sections,
  kpis,
}) => {
  const theme = useTheme();
  const monoFontFamily = theme.typography.fontFamily;
  const rangeDescription =
    range === 'all'
      ? 'All-time totals'
      : `Deltas vs previous ${range.toUpperCase()} window`;

  return (
    <>
      <Box sx={{ mt: 1.2, pt: 1.2 }}>
        <Grid container spacing={{ xs: 1.5, md: 2 }}>
          {sections.map((section) => (
            <Grid item xs={12} lg={6} key={section.title}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.border.light}`,
                  backgroundColor: 'transparent',
                }}
                elevation={0}
              >
                <CardContent
                  sx={{
                    p: { xs: 1.35, sm: 1.5 },
                    '&:last-child': { pb: { xs: 1.35, sm: 1.5 } },
                  }}
                >
                  {/* Card header */}
                  <Box sx={{ mb: 1.25 }}>
                    <Typography
                      sx={{
                        color: theme.palette.text.primary,
                        fontFamily: monoFontFamily,
                        fontSize: { xs: '0.98rem', sm: '1.05rem' },
                        fontWeight: 700,
                      }}
                    >
                      {section.title}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.18,
                        color: 'text.secondary',
                        fontFamily: monoFontFamily,
                        fontSize: '0.7rem',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {rangeDescription}
                    </Typography>
                  </Box>

                  {/* Two pools side by side */}
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <PoolColumn
                        sectionTitle={section.title}
                        pool={section.eligible}
                        isEligible={true}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <PoolColumn
                        sectionTitle={section.title}
                        pool={section.ineligible}
                        isEligible={false}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ mt: 1.35, pt: 1.15 }}>
        <Grid container spacing={{ xs: 1.25, md: 1.5 }}>
          {kpis.map((kpi) => (
            <Grid item xs={12} sm={6} md={6} lg={6} xl={3} key={kpi.title}>
              <KpiCard
                title={kpi.title}
                value={kpi.value}
                subtitle={kpi.subtitle}
                sx={{ height: '100%' }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </>
  );
};

export default DashboardOverview;
