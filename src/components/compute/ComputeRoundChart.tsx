import React, { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { TEXT_OPACITY } from '../../theme';
import {
  echartsAxisTooltipChrome,
  echartsFontFamily,
  echartsGridLineChart,
  echartsMutedCartesianAxisColors,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';
import { ChartEmptyPanel } from '../common/ChartEmptyPanel';
import { formatRoundTime } from './computeFormat';

interface ComputeRoundChartProps {
  title: string;
  /** ISO round timestamps, ascending. */
  timestamps: string[];
  /** Same length as `timestamps`; null gaps break the line. */
  values: (number | null)[];
  color: string;
  /** Fixed y-axis ceiling (e.g. 1 for scores); omit to auto-scale. */
  yMax?: number;
  decimals?: number;
  emptyHint: string;
  height?: number;
}

/** Small single-series line chart for one per-round metric. */
export const ComputeRoundChart: React.FC<ComputeRoundChartProps> = ({
  title,
  timestamps,
  values,
  color,
  yMax,
  decimals = 2,
  emptyHint,
  height = 180,
}) => {
  const theme = useTheme();
  const hasData = values.some((v) => v !== null && Number.isFinite(v));

  const option = useMemo(() => {
    const axis = echartsMutedCartesianAxisColors(theme);
    const fontFamily = echartsFontFamily(theme);
    return {
      ...echartsTransparentBackground(),
      animation: false,
      grid: echartsGridLineChart(),
      tooltip: {
        trigger: 'axis',
        ...echartsAxisTooltipChrome(theme),
        axisPointer: { type: 'line', lineStyle: { color: axis.axisLineColor } },
        formatter: (raw: unknown) => {
          const point = (Array.isArray(raw) ? raw : [raw])[0] as
            | { dataIndex?: number; value?: number | null }
            | undefined;
          if (!point || point.dataIndex === undefined) return '';
          const value = point.value;
          const label =
            value === null || value === undefined
              ? '—'
              : Number(value).toFixed(decimals);
          return `${formatRoundTime(timestamps[point.dataIndex])}<br/><b>${label}</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        boundaryGap: false,
        axisLine: { lineStyle: { color: axis.axisLineColor } },
        axisTick: { show: false },
        axisLabel: {
          color: axis.labelColor,
          fontSize: 10,
          fontFamily,
          hideOverlap: true,
          formatter: (iso: string) =>
            new Date(iso).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            }),
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: yMax,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: axis.labelColor, fontSize: 10, fontFamily },
        splitLine: { lineStyle: { color: axis.splitLineColor } },
      },
      series: [
        {
          type: 'line',
          data: values,
          showSymbol: false,
          smooth: false,
          connectNulls: false,
          lineStyle: { width: 2, color },
          areaStyle: { color: alpha(color, 0.12) },
        },
      ],
    };
  }, [theme, timestamps, values, color, yMax, decimals]);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="monoSmall"
        sx={{
          display: 'block',
          color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
          mb: 0.75,
        }}
      >
        {title}
      </Typography>
      <ChartEmptyPanel
        empty={!hasData}
        minHeight={height}
        title="No rounds in range"
        hint={emptyHint}
      >
        <Box sx={{ height, width: '100%' }}>
          <ReactECharts
            option={option}
            notMerge
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </Box>
      </ChartEmptyPanel>
    </Box>
  );
};
