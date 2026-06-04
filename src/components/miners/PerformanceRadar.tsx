import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import {
  echartsRadarChrome,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';
import { ChartEmptyPanel } from '../common/ChartEmptyPanel';

interface PerformanceRadarProps {
  credibility: number;
  complexity: number;
  mergedPrs: number;
  uniqueRepos: number;
  totalPRs: number;
  avgRepoWeight: number;
  /** When true, show empty state instead of radar (e.g. miner has no PRs yet). */
  isActivityEmpty?: boolean;
}

const PerformanceRadar: React.FC<PerformanceRadarProps> = ({
  credibility,
  complexity,
  mergedPrs,
  uniqueRepos,
  totalPRs,
  avgRepoWeight,
  isActivityEmpty = false,
}) => {
  const theme = useTheme();

  const chartOption = useMemo(
    () => ({
      ...echartsTransparentBackground(),
      radar: {
        ...echartsRadarChrome(theme),
        indicator: [
          { name: 'Success\nrate', max: 100 },
          { name: 'Code\ndepth', max: 100 },
          { name: 'Merged\nPRs', max: 100 },
          { name: 'Repo\nspread', max: 100 },
          { name: 'PR\nvolume', max: 100 },
          { name: 'Repo\npayout', max: 100 },
        ],
        center: ['50%', '50%'],
        radius: '50%',
        shape: 'circle',
        splitNumber: 5,
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
                complexity,
                mergedPrs,
                uniqueRepos,
                totalPRs,
                avgRepoWeight,
              ],
              name: 'Miner Stats',
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
      complexity,
      mergedPrs,
      uniqueRepos,
      totalPRs,
      avgRepoWeight,
      theme,
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
          color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
          mb: 0.5,
          textAlign: 'center',
        }}
      >
        Performance Profile
      </Typography>
      <Typography
        sx={{
          color: alpha(theme.palette.common.white, TEXT_OPACITY.faint),
          fontSize: '0.62rem',
          mb: 1.5,
          textAlign: 'center',
        }}
      >
        Each axis scaled 0–100 vs the network's best
      </Typography>
      <ChartEmptyPanel
        empty={isActivityEmpty}
        minHeight={220}
        title="No activity yet"
        hint="Your performance profile appears after your first PRs are recorded on Gittensor."
      >
        <Box sx={{ height: '220px', width: '100%' }}>
          <ReactECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </Box>
      </ChartEmptyPanel>
    </Box>
  );
};

export default PerformanceRadar;
