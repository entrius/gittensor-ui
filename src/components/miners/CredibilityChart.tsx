import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../../theme';

interface CredibilityChartProps {
  merged: number;
  open: number;
  closed: number;
  credibility: number;
}

const CredibilityChart: React.FC<CredibilityChartProps> = ({
  merged,
  open,
  closed,
  credibility,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const chartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      title: {
        text: `${(credibility * 100).toFixed(0)}%`,
        subtext: 'Credibility',
        left: 'center',
        top: '38%',
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: 28,
          fontWeight: 'bold',
          fontFamily: '"JetBrains Mono", monospace',
        },
        subtextStyle: {
          color: alpha(theme.palette.text.primary, 0.4),
          fontSize: 11,
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 500,
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: isDark
          ? 'rgba(0, 0, 0, 0.9)'
          : 'rgba(255, 255, 255, 0.95)',
        borderColor: theme.palette.border.light,
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: '"JetBrains Mono", monospace',
        },
      },
      series: [
        {
          name: 'PR Status',
          type: 'pie',
          radius: ['58%', '72%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: isDark ? '#0d1117' : theme.palette.background.default,
            borderWidth: 3,
          },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: false }, scale: true, scaleSize: 5 },
          labelLine: { show: false },
          data: [
            {
              value: merged,
              name: 'Merged',
              itemStyle: { color: CHART_COLORS.merged },
            },
            {
              value: open,
              name: 'Open',
              itemStyle: { color: CHART_COLORS.open },
            },
            {
              value: closed,
              name: 'Closed',
              itemStyle: { color: CHART_COLORS.closed },
            },
          ],
        },
      ],
    }),
    [merged, open, closed, credibility, theme, isDark],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography
        variant="monoSmall"
        sx={{
          color: alpha(theme.palette.text.primary, 0.4),
          mb: 0.75,
          textAlign: 'center',
        }}
      >
        PR Success Ratio
      </Typography>

      <Box sx={{ height: '190px', width: '100%', mb: 0.75 }}>
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </Box>

      {/* Stats Legend */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <LegendItem label="Merged" value={merged} color={CHART_COLORS.merged} />
        <LegendItem label="Open" value={open} color={CHART_COLORS.open} />
        <LegendItem label="Closed" value={closed} color={CHART_COLORS.closed} />
      </Box>
    </Box>
  );
};

const LegendItem: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      <Typography
        sx={{
          color: alpha(theme.palette.text.primary, 0.6),
          fontSize: '0.65rem',
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          color,
          fontSize: '0.75rem',
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default CredibilityChart;
