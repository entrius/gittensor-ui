import React, { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS, STATUS_COLORS } from '../../theme';

interface PRStats {
  merged: number;
  open: number;
  closed: number;
  credibility: number;
}

interface PRStatusChartProps {
  stats: PRStats;
  title: string;
  subtitle?: string;
  variant?: 'primary' | 'secondary';
}

const PRStatusChart: React.FC<PRStatusChartProps> = ({
  stats,
  title,
  subtitle,
  variant = 'primary',
}) => {
  const { merged, open, closed, credibility } = stats;
  const credibilityPercent = credibility * 100;
  const isPrimary = variant === 'primary';

  const chartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      title: {
        text: `${credibilityPercent.toFixed(0)}%`,
        left: 'center',
        top: 'center',
        textStyle: {
          color: isPrimary ? '#fff' : 'rgba(255, 255, 255, 0.7)',
          fontSize: isPrimary ? 22 : 18,
          fontWeight: 'bold',
          fontFamily: '"JetBrains Mono", monospace',
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        textStyle: { color: '#fff', fontFamily: '"JetBrains Mono", monospace' },
      },
      series: [
        {
          name: 'PR Status',
          type: 'pie',
          radius: ['70%', '85%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#0d1117',
            borderWidth: 2,
          },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: false }, scale: true, scaleSize: 3 },
          labelLine: { show: false },
          data: [
            {
              value: merged,
              name: 'Merged',
              itemStyle: {
                color: CHART_COLORS.merged,
                opacity: isPrimary ? 1 : 0.7,
              },
            },
            {
              value: open,
              name: 'Open',
              itemStyle: {
                color: CHART_COLORS.open,
                opacity: isPrimary ? 1 : 0.7,
              },
            },
            {
              value: closed,
              name: 'Closed',
              itemStyle: {
                color: CHART_COLORS.closed,
                opacity: isPrimary ? 1 : 0.7,
              },
            },
          ],
        },
      ],
    }),
    [merged, open, closed, credibilityPercent, isPrimary],
  );

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <Typography
        sx={{
          color: isPrimary ? STATUS_COLORS.success : 'rgba(255, 255, 255, 0.5)',
          fontSize: {
            xs: '0.6rem',
            sm: '0.65rem',
            lg: '0.7rem',
            xl: '0.75rem',
          },
          fontWeight: 700,
          fontFamily: '"JetBrains Mono", monospace',
          textTransform: 'uppercase',
          textAlign: 'center',
          mb: 1,
          width: '100%',
          minHeight: { xs: '2.5em', xl: 'auto' },
        }}
      >
        {title}
        {subtitle && (
          <Box
            component="span"
            sx={{
              display: { xs: 'block', xl: 'inline' },
              ml: { xl: 1 },
              fontSize: { xs: '0.55rem', lg: '0.6rem', xl: '0.65rem' },
              opacity: 0.7,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            ({subtitle})
          </Box>
        )}
      </Typography>

      <Box
        sx={{
          width: '100%',
          flex: 1,
          minHeight: { xs: '100px', md: '120px' },
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%', overflow: 'visible' }}
          opts={{ renderer: 'svg' }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: { xs: 0.5, sm: 1, xl: 2 },
          mt: 1,
          width: '100%',
          justifyContent: 'space-evenly',
          overflow: 'hidden',
        }}
      >
        <StatItem label="Merged" value={merged} />
        <StatItem label="Open" value={open} />
        <StatItem label="Closed" value={closed} />
      </Box>
    </Box>
  );
};

const StatItem: React.FC<{ label: string; value: number }> = ({
  label,
  value,
}) => (
  <Stack gap={0.25} direction="column" alignItems="center" sx={{ minWidth: 0 }}>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: { xs: '0.45rem', sm: '0.5rem', lg: '0.55rem', xl: '0.6rem' },
        fontWeight: 600,
        textTransform: 'uppercase',
        color: 'rgba(255, 255, 255, 0.4)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: {
          xs: '0.65rem',
          sm: '0.75rem',
          md: '0.8rem',
          lg: '0.85rem',
          xl: '0.95rem',
        },
        fontWeight: 600,
        color: '#fff',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </Typography>
  </Stack>
);

export default PRStatusChart;
