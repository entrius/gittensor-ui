import React from "react";
import { Grid, Box, CircularProgress, Typography } from "@mui/material";
import { KpiCard } from "../dashboard";
import { useIssueStats } from "../../api/IssuesApi";

export const IssueStatsCards: React.FC = () => {
  const { data: stats, isLoading, isError } = useIssueStats();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !stats) {
    return null;
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    if (days > 0) {
      return `${days}d`;
    }
    const hours = Math.floor(seconds / 3600);
    if (hours > 0) {
      return `${hours}h`;
    }
    return `${Math.floor(seconds / 60)}m`;
  };

  return (
    <Grid
      container
      spacing={{ xs: 2, sm: 2, md: 3 }}
      sx={{
        maxWidth: { md: "1200px" },
        mx: "auto",
      }}
    >
      {/* Total Bounty Pool - Featured prominently */}
      <Grid item xs={12} sm={6} md={3}>
        <KpiCard
          variant="medium"
          value={formatCurrency(stats.totalBountyPoolUsd)}
          title="Total Bounty Pool*"
          subtitle="Active bounties"
        />
      </Grid>

      {/* Active Issues */}
      <Grid item xs={12} sm={6} md={3}>
        <KpiCard
          variant="medium"
          value={stats.activeIssuesCount.toLocaleString()}
          title="Active Issues"
          subtitle="Waiting to be solved"
        />
      </Grid>

      {/* Solved Issues */}
      <Grid item xs={12} sm={6} md={3}>
        <KpiCard
          variant="medium"
          value={stats.solvedIssuesCount.toLocaleString()}
          title="Solved Issues"
          subtitle={`${formatCurrency(stats.totalPaidOut)} paid out`}
        />
      </Grid>

      {/* Average Time to Solve - More enticing */}
      <Grid item xs={12} sm={6} md={3}>
        <KpiCard
          variant="medium"
          value={stats.averageTimeToSolve > 0 ? formatTime(stats.averageTimeToSolve) : "-"}
          title="Avg. Time to Solve"
          subtitle={`${formatCurrency(stats.averageBountyUsd)} avg. bounty`}
        />
      </Grid>
    </Grid>
  );
};
