import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { TEXT_OPACITY } from '../../theme';
import {
  echartsRadarChrome,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';
import { useChartColors } from '../../hooks/useChartColors';

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
  const { merged: radarColor } = useChartColors();

  const chartOption = useMemo(
    () => ({
      ...echartsTransparentBackground(),
      radar: {
        ...echartsRadarChrome(theme),
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
      },
      series: [
        {
          type: 'radar',
          lineStyle: { width: 2, color: radarColor },
          areaStyle: { color: alpha(radarColor, 0.2) },
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
              itemStyle: { color: radarColor },
            },
          ],
        },
      ],
    }),
    [
      credibility,
      complexity,
      issuesSolved,
      uniqueRepos,
      totalPRs,
      avgRepoWeight,
      theme,
      radarColor,
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
          color: alpha(theme.palette.text.primary, TEXT_OPACITY.muted),
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
