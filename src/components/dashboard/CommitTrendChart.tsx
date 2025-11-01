import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, Typography, useTheme } from "@mui/material";
import { useHistoricalTrend } from "../../api";
import dayjs from "dayjs";

const CommitTrendChart: React.FC = () => {
  const theme = useTheme();

  const { data, isLoading } = useHistoricalTrend();

  const option = {
    title: {
      show: false,
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const data = params[0];
        return `${dayjs(data.axisValue).format(
          "YYYY-MM-DD",
        )}<br/>Lines Committed: ${data.value.toLocaleString()}`;
      },
    },
    grid: {
      top: "5%",
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
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        formatter: (value: string) => {
          const date = dayjs(value);
          return `${date.month() + 1}/${date.date()}`;
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
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
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
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "transparent",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      elevation={0}
    >
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 1, fontSize: "1rem" }}>
          Lines Committed Trend
        </Typography>
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%", minHeight: "200px" }}
          opts={{ renderer: "canvas" }}
        />
      </CardContent>
    </Card>
  );
};

export default CommitTrendChart;
