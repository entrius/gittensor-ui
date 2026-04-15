import React from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Card,
  CardContent,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useHistoricalTrend } from '../../api';

const formatUtcYmd = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const CommitTrendChart: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data } = useHistoricalTrend();

  const tenDaysAgoMs = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const filteredData = Array.isArray(data)
    ? data.filter((item) => new Date(item.date).getTime() > tenDaysAgoMs)
    : [];

  const option = {
    title: {
      show: false,
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${formatUtcYmd(data.axisValue)} UTC<br/>Lines Committed: ${data.value.toLocaleString()}`;
      },
      backgroundColor: theme.palette.surface.tooltip,
      borderColor: theme.palette.border.light,
      borderWidth: 1,
      textStyle: {
        color: theme.palette.text.primary,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: isMobile ? 11 : 12,
      },
      padding: [8, 12],
    },
    grid: {
      top: isMobile ? '8%' : '6%',
      left: isMobile ? '2%' : '3%',
      right: isMobile ? '2%' : '3%',
      bottom: isMobile ? '8%' : '6%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: filteredData?.map((item) => item.date),
      axisLabel: {
        color: theme.palette.text.secondary,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: isMobile ? 10 : 11,
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
        },
        margin: isMobile ? 8 : 12,
      },
      axisLine: {
        lineStyle: {
          color: theme.palette.divider,
        },
      },
    },
    yAxis: {
      type: 'log',
      logBase: 10,
      axisLabel: {
        color: theme.palette.text.secondary,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: isMobile ? 10 : 11,
        formatter: (value: number) => {
          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
          return value.toString();
        },
        margin: isMobile ? 8 : 12,
      },
      axisLine: {
        lineStyle: {
          color: theme.palette.divider,
        },
      },
      splitLine: {
        lineStyle: {
          color: theme.palette.divider,
          opacity: 0.3,
        },
      },
    },
    series: [
      {
        name: 'Lines Committed',
        type: 'line',
        data: filteredData?.map((item) =>
          typeof item.linesCommitted === 'string'
            ? parseInt(item.linesCommitted)
            : item.linesCommitted,
        ),
        smooth: true,
        lineStyle: {
          color: theme.palette.primary.main,
          width: isMobile ? 2 : 2.5,
        },
        itemStyle: {
          color: theme.palette.primary.main,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: `${theme.palette.primary.main}40`,
              },
              {
                offset: 1,
                color: `${theme.palette.primary.main}10`,
              },
            ],
          },
        },
        emphasis: {
          focus: 'series',
        },
      },
    ],
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: 'transparent',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      elevation={0}
    >
      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: isMobile ? 1.5 : 2,
          '&:last-child': { pb: isMobile ? 1.5 : 2 },
          minHeight: 0,
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            mb: isMobile ? 0.5 : 1,
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          Lines Committed Trend
        </Typography>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%', flex: '1 1 0', minHeight: 0 }}
          opts={{ renderer: 'canvas' }}
        />
      </CardContent>
    </Card>
  );
};

export default CommitTrendChart;
