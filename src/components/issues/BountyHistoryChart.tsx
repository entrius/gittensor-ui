import React, { useMemo } from "react";
import { Box, Typography, CircularProgress, useTheme } from "@mui/material";
import ReactECharts from "echarts-for-react";
import { useBountyHistory } from "../../api/IssuesApi";
import dayjs from "dayjs";

interface BountyHistoryChartProps {
  days?: number;
}

export const BountyHistoryChart: React.FC<BountyHistoryChartProps> = ({
  days = 30,
}) => {
  const theme = useTheme();
  const { data: history, isLoading, isError } = useBountyHistory(days);

  const chartOption = useMemo(() => {
    if (!history || history.length === 0) {
      return null;
    }

    const dates = history.map((point) =>
      dayjs(point.timestamp).format("MMM D")
    );

    // Calculate cumulative totals
    const dataByDate: Record<string, { totalBounty: number }> = {};

    history.forEach((point) => {
      const date = dayjs(point.timestamp).format("MMM D");
      if (!dataByDate[date]) {
        dataByDate[date] = { totalBounty: 0 };
      }
      dataByDate[date].totalBounty = point.totalBountyPoolUsd;
    });

    const uniqueDates = Array.from(new Set(dates));
    const bountyValues = uniqueDates.map(date => dataByDate[date]?.totalBounty || 0);

    return {
      backgroundColor: "transparent",
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "10%",
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10, 15, 31, 0.95)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        textStyle: {
          color: "#ffffff",
          fontFamily: '"Inter", sans-serif',
        },
        formatter: (params: any) => {
          const param = params[0];
          const value = param.value.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
          return `${param.axisValue}<br/><strong>${value}</strong> Total Active Bounties`;
        },
      },
      xAxis: {
        type: "category",
        data: uniqueDates,
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        axisLabel: {
          color: "#7d7d7d",
          fontFamily: '"Inter", sans-serif',
          fontSize: 11,
        },
      },
      yAxis: {
        type: "value",
        axisLine: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: "rgba(255, 255, 255, 0.05)",
          },
        },
        axisLabel: {
          color: "#7d7d7d",
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000000) {
              return `$${(value / 1000000).toFixed(1)}M`;
            }
            if (value >= 1000) {
              return `$${(value / 1000).toFixed(0)}K`;
            }
            return `$${value}`;
          },
        },
      },
      series: [
        {
          name: "Total Bounty Pool",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: theme.palette.primary.main,
            width: 3,
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
                  color: `${theme.palette.primary.main}30`,
                },
                {
                  offset: 1,
                  color: `${theme.palette.primary.main}00`,
                },
              ],
            },
          },
          data: bountyValues,
        },
      ],
    };
  }, [history, theme]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 300,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 3,
          backgroundColor: "transparent",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !chartOption) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 300,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 3,
          backgroundColor: "transparent",
        }}
      >
        <Typography color="text.secondary">
          Unable to load bounty history
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 3,
        backgroundColor: "transparent",
        p: { xs: 2, sm: 3 },
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontFamily: '"CY Grotesk Grand", "Inter", sans-serif',
        }}
      >
        Total Active Bounty Pool
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        Cumulative value of all active bounties over the last {days} days
      </Typography>
      <ReactECharts
        option={chartOption}
        style={{ height: "300px" }}
        opts={{ renderer: "svg" }}
      />
    </Box>
  );
};
