import React from 'react';
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { alpha, type Theme, useTheme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import KpiCard from '../../../components/KpiCard';
import {
  type DashboardKpi,
  type DashboardOverviewSection,
  type PresetTimeRange,
} from '../dashboardData';

interface DashboardOverviewProps {
  range: PresetTimeRange;
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

const getMetricTone = (theme: Theme, sectionTitle: string, label: string) => {
  if (label === 'Total') return theme.palette.text.primary;
  if (isResolvedMetric(label)) return theme.palette.status.merged;
  if (label === 'Open') return theme.palette.status.open;
  if (label === 'Closed') return theme.palette.status.closed;
  if (label === 'Unique Repositories') {
    return sectionTitle === 'OSS Contributions'
      ? theme.palette.status.info
      : theme.palette.status.warning;
  }
  return theme.palette.text.primary;
};

const getDeltaColor = (theme: Theme, delta: string): string => {
  if (delta.startsWith('+')) return theme.palette.status.success;
  if (delta.startsWith('-')) return theme.palette.status.closed;
  return alpha(theme.palette.text.primary, 0.48);
};

const buildStatusChartOption = (
  theme: Theme,
  total: string,
  segments: DashboardOverviewSection['chartSegments'],
): Record<string, unknown> => {
  const totalValue = segments.reduce((sum, segment) => sum + segment.value, 0);
  const monoFontFamily = theme.typography.mono.fontFamily;

  return {
    backgroundColor: 'transparent',
    title: {
      text: total,
      left: 'center',
      top: '34%',
      textStyle: {
        color: theme.palette.text.primary,
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: monoFontFamily,
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: ({
        name,
        value,
        percent,
      }: {
        name: string;
        value: number;
        percent: number;
      }) => `${name}: ${Number(value).toLocaleString()} (${percent}%)`,
      backgroundColor: theme.palette.surface.tooltip,
      borderColor: alpha(theme.palette.text.primary, 0.15),
      borderWidth: 1,
      textStyle: {
        color: theme.palette.text.primary,
        fontFamily: monoFontFamily,
      },
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

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  range,
  sections,
  kpis,
}) => {
  const theme = useTheme();
  const monoFontFamily = theme.typography.mono.fontFamily;

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
                  <Grid
                    container
                    spacing={{ xs: 1.5, md: 1.75 }}
                    alignItems="center"
                  >
                    <Grid item xs={12} md={7}>
                      <Box sx={{ minWidth: 0 }}>
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
                          {`Deltas vs previous ${range.toUpperCase()} window`}
                        </Typography>
                      </Box>

                      <Stack spacing={0.55} sx={{ mt: 0.7 }}>
                        {section.metrics.map((metric) => (
                          <Box
                            key={`${section.title}-${metric.label}`}
                            sx={{
                              py: 0.58,
                              borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
                              '&:first-of-type': {
                                borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                              },
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="baseline"
                              spacing={1.5}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    color: alpha(
                                      theme.palette.text.primary,
                                      0.82,
                                    ),
                                    fontFamily: monoFontFamily,
                                    fontSize: '0.68rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                  }}
                                >
                                  {metric.label}
                                </Typography>
                                <Typography
                                  sx={{
                                    mt: 0.12,
                                    color: getDeltaColor(theme, metric.delta),
                                    fontFamily: monoFontFamily,
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {metric.delta}
                                </Typography>
                              </Box>

                              <Typography
                                sx={{
                                  color: getMetricTone(
                                    theme,
                                    section.title,
                                    metric.label,
                                  ),
                                  fontFamily: monoFontFamily,
                                  fontSize: { xs: '0.96rem', sm: '1.04rem' },
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
                    </Grid>

                    <Grid item xs={12} md={5}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.7,
                        }}
                      >
                        <Box
                          sx={{
                            width: 116,
                            height: 116,
                            flexShrink: 0,
                            '& > div': { width: '100%', height: '100%' },
                          }}
                        >
                          <ReactECharts
                            option={buildStatusChartOption(
                              theme,
                              section.chartTotal,
                              section.chartSegments,
                            )}
                            style={{ width: '100%', height: '100%' }}
                            opts={{ renderer: 'svg' }}
                          />
                        </Box>

                        <Stack
                          direction="row"
                          spacing={1}
                          useFlexGap
                          flexWrap="wrap"
                          justifyContent="center"
                        >
                          {section.chartSegments.map((segment) => (
                            <Stack
                              key={`${section.title}-${segment.label}`}
                              direction="row"
                              spacing={0.6}
                              alignItems="center"
                            >
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: getSegmentColor(
                                    theme,
                                    segment.label,
                                  ),
                                }}
                              />
                              <Typography
                                sx={{
                                  color: alpha(
                                    theme.palette.text.primary,
                                    0.58,
                                  ),
                                  fontFamily: monoFontFamily,
                                  fontSize: '0.66rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                }}
                              >
                                {segment.label}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
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
