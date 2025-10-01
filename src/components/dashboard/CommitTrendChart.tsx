import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, Typography, useTheme } from "@mui/material";
import { useHistoricalTrend } from "../../api";

const CommitTrendChart: React.FC = () => {
  const theme = useTheme();

  const { data, isLoading } = useHistoricalTrend();

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
      data: data?.map((item) => item.date),
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
        data: data?.map((item) => item.linesCommitted),
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
