import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, Typography, useTheme } from "@mui/material";

interface CommitTrendData {
  date: string;
  linesCommitted: number;
}

interface CommitTrendChartProps {
  data?: CommitTrendData[];
}

const CommitTrendChart: React.FC<CommitTrendChartProps> = ({ data }) => {
  const theme = useTheme();

  // Mock data for historical trend (last 30 days)
  const mockData: CommitTrendData[] = data || [
    { date: "2024-08-17", linesCommitted: 1250 },
    { date: "2024-08-18", linesCommitted: 890 },
    { date: "2024-08-19", linesCommitted: 1420 },
    { date: "2024-08-20", linesCommitted: 780 },
    { date: "2024-08-21", linesCommitted: 2100 },
    { date: "2024-08-22", linesCommitted: 1650 },
    { date: "2024-08-23", linesCommitted: 920 },
    { date: "2024-08-24", linesCommitted: 1320 },
    { date: "2024-08-25", linesCommitted: 1850 },
    { date: "2024-08-26", linesCommitted: 1100 },
    { date: "2024-08-27", linesCommitted: 1450 },
    { date: "2024-08-28", linesCommitted: 980 },
    { date: "2024-08-29", linesCommitted: 1720 },
    { date: "2024-08-30", linesCommitted: 1380 },
    { date: "2024-08-31", linesCommitted: 2200 },
    { date: "2024-09-01", linesCommitted: 1560 },
    { date: "2024-09-02", linesCommitted: 840 },
    { date: "2024-09-03", linesCommitted: 1890 },
    { date: "2024-09-04", linesCommitted: 1240 },
    { date: "2024-09-05", linesCommitted: 1670 },
    { date: "2024-09-06", linesCommitted: 1120 },
    { date: "2024-09-07", linesCommitted: 1980 },
    { date: "2024-09-08", linesCommitted: 1450 },
    { date: "2024-09-09", linesCommitted: 870 },
    { date: "2024-09-10", linesCommitted: 1630 },
    { date: "2024-09-11", linesCommitted: 1290 },
    { date: "2024-09-12", linesCommitted: 2010 },
    { date: "2024-09-13", linesCommitted: 1560 },
    { date: "2024-09-14", linesCommitted: 1180 },
    { date: "2024-09-15", linesCommitted: 1740 },
  ];

  const option = {
    title: {
      show: false,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
      formatter: (params: any) => {
        const data = params[0];
        return `${
          data.axisValue
        }<br/>Lines Committed: ${data.value.toLocaleString()}`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: mockData.map((item) => item.date),
      axisLabel: {
        color: theme.palette.text.secondary,
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
      },
      axisLine: {
        lineStyle: {
          color: theme.palette.divider,
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: theme.palette.text.secondary,
        formatter: (value: number) => {
          return value >= 1000
            ? `${(value / 1000).toFixed(1)}k`
            : value.toString();
        },
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
        name: "Lines Committed",
        type: "line",
        data: mockData.map((item) => item.linesCommitted),
        smooth: true,
        lineStyle: {
          color: theme.palette.primary.main,
          width: 3,
        },
        itemStyle: {
          color: theme.palette.primary.main,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: theme.palette.primary.main + "40",
              },
              {
                offset: 1,
                color: theme.palette.primary.main + "10",
              },
            ],
          },
        },
        emphasis: {
          focus: "series",
        },
      },
    ],
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Lines Committed Historical Trend
        </Typography>
        <ReactECharts
          option={option}
          style={{ height: "400px", width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      </CardContent>
    </Card>
  );
};

export default CommitTrendChart;
