import React from "react";
import { Grid, Box, CircularProgress } from "@mui/material";
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

  const formatCurrency = (value: number | undefined) => {
    if (!value || isNaN(value)) {
      return "$0";
    }
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Grid
        container
        spacing={{ xs: 2, sm: 2, md: 3 }}
      >
        {/* Total Bounty Pool - Featured prominently */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            variant="medium"
            value={formatCurrency(stats?.totalBountyPoolUsd)}
            title="Total Bounty Pool*"
            subtitle="Active bounties"
          />
        </Grid>

        {/* Active Issues */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            variant="medium"
            value={(stats?.activeIssuesCount || 0).toLocaleString()}
            title="Active Issues"
            subtitle="Waiting to be solved"
          />
        </Grid>

        {/* Solved Issues */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            variant="medium"
            value={(stats?.solvedIssuesCount || 0).toLocaleString()}
            title="Solved Issues"
            subtitle={`${formatCurrency(stats?.totalPaidOut)} paid out`}
          />
        </Grid>

        {/* Success Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            variant="medium"
            value={
              stats?.totalIssuesCount && stats.totalIssuesCount > 0
                ? `${Math.round(
                    (stats.solvedIssuesCount / stats.totalIssuesCount) * 100
                  )}%`
                : "0%"
            }
            title="Success Rate"
            subtitle={`${stats?.totalIssuesCount || 0} total issues`}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
