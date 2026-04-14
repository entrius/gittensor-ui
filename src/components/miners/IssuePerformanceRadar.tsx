import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { STATUS_COLORS } from '../../theme';

interface IssuePerformanceRadarProps {
  credibility: number;
  tokenScore: number;
  solvedIssues: number;
  uniqueRepos: number;
  totalIssues: number;
  avgRepoWeight: number;
}

const IssuePerformanceRadar: React.FC<IssuePerformanceRadarProps> = ({
  credibility,
  tokenScore,
  solvedIssues,
  uniqueRepos,
  totalIssues,
  avgRepoWeight,
}) => {
  const chartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      radar: {
        indicator: [
          { name: 'Credibility', max: 100 },
          { name: 'Token\nScore', max: 100 },
          { name: 'Solved\nIssues', max: 100 },
          { name: 'Unique\nRepos', max: 100 },
          { name: 'Total\nIssues', max: 100 },
          { name: 'Avg Repo\nWeight', max: 100 },
        ],
        center: ['50%', '50%'],
        radius: '50%',
        shape: 'circle',
        splitNumber: 5,
        axisName: {
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          lineHeight: 12,
        },
        splitLine: {
          lineStyle: {
            color: Array(5).fill('rgba(255, 255, 255, 0.05)'),
          },
        },
        splitArea: { show: false },
        axisLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.1)' },
        },
      },
      series: [
        {
          type: 'radar',
          lineStyle: {
            width: 2,
            color: STATUS_COLORS.merged,
          },
          areaStyle: {
            color: `${STATUS_COLORS.merged}33`,
          },
          data: [
            {
              value: [
                credibility,
                tokenScore,
                solvedIssues,
                uniqueRepos,
                totalIssues,
                avgRepoWeight,
              ],
              name: 'Issue Stats',
              symbol: 'circle',
              symbolSize: 4,
              itemStyle: { color: STATUS_COLORS.merged },
            },
          ],
        },
      ],
    }),
    [
      credibility,
      tokenScore,
      solvedIssues,
      uniqueRepos,
      totalIssues,
      avgRepoWeight,
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
        sx={{ color: 'text.secondary', mb: 2, textAlign: 'center' }}
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

export default IssuePerformanceRadar;
