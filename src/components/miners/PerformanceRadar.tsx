import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';

interface PerformanceRadarProps {
  credibility: number;
  complexity: number;
  issuesSolved: number;
  uniqueRepos: number;
  totalPRs: number;
  avgRepoWeight: number;
}

const PerformanceRadar: React.FC<PerformanceRadarProps> = ({
  credibility,
  complexity,
  issuesSolved,
  uniqueRepos,
  totalPRs,
  avgRepoWeight,
}) => {
  const theme = useTheme();

  const chartOption = useMemo(
    () => ({
      backgroundColor: theme.palette.surface.transparent,
      radar: {
        indicator: [
          { name: 'Credibility', max: 100 },
          { name: 'Complexity', max: 100 },
          { name: 'Issues\nSolved', max: 100 },
          { name: 'Unique\nRepos', max: 100 },
          { name: 'Total\nPRs', max: 100 },
          { name: 'Avg Repo\nWeight', max: 100 },
        ],
        center: ['50%', '50%'],
        radius: '50%',
        shape: 'circle',
        splitNumber: 5,
        axisName: {
          color: alpha(theme.palette.text.primary, 0.6),
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          lineHeight: 12,
        },
        splitLine: {
          lineStyle: {
            color: Array(5).fill(theme.palette.border.subtle),
          },
        },
        splitArea: { show: false },
        axisLine: {
          lineStyle: { color: theme.palette.border.light },
        },
      },
      series: [
        {
          type: 'radar',
          lineStyle: {
            width: 2,
            color: theme.palette.chart.merged,
          },
          areaStyle: {
            color: alpha(theme.palette.chart.merged, 0.2),
          },
          data: [
            {
              value: [
                credibility,
                complexity,
                issuesSolved,
                uniqueRepos,
                totalPRs,
                avgRepoWeight,
              ],
              name: 'Miner Stats',
              symbol: 'circle',
              symbolSize: 4,
              itemStyle: { color: theme.palette.chart.merged },
            },
          ],
        },
      ],
    }),
    [
      avgRepoWeight,
      credibility,
      complexity,
      issuesSolved,
      theme,
      totalPRs,
      uniqueRepos,
    ],
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
          mb: 2,
          textAlign: 'center',
        }}
      >
        Performance Profile
      </Typography>
      <Box sx={{ height: '220px', width: '100%' }}>
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </Box>
    </Box>
  );
};

export default PerformanceRadar;
