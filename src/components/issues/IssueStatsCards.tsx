import React from "react";
import { Grid, Box, CircularProgress } from "@mui/material";
import { KpiCard } from "../dashboard";
import { useIssueStats } from "../../api/IssuesApi";
import type { CurrencyDisplay } from "../../pages/IssuesPage";

interface IssueStatsCardsProps {
  currencyDisplay?: CurrencyDisplay;
}

export const IssueStatsCards: React.FC<IssueStatsCardsProps> = ({ currencyDisplay = "usd" }) => {
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

  const formatValue = (usdValue: number | undefined, alphaValue: number | undefined) => {
    if (currencyDisplay === "alpha") {
      if (!alphaValue || isNaN(alphaValue)) return "0 ل";
      if (alphaValue >= 1000000) return `${(alphaValue / 1000000).toFixed(2)}M ل`;
      if (alphaValue >= 1000) return `${(alphaValue / 1000).toFixed(1)}K ل`;
      return `${alphaValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} ل`;
    }
    // USD display
    if (!usdValue || isNaN(usdValue)) return "$0";
    if (usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
    if (usdValue >= 1000) return `$${(usdValue / 1000).toFixed(1)}K`;
    return `$${usdValue.toFixed(2)}`;
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
            value={formatValue(stats?.totalBountyPoolUsd, stats?.totalBountyPoolAlpha)}
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
            subtitle={`${formatValue(stats?.totalPaidOutUsd, stats?.totalPaidOutAlpha)} paid out`}
          />
        </Grid>

        {/* Success Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            variant="medium"
            value={`${stats?.successRate ?? 0}%`}
            title="Success Rate"
            subtitle={`${stats?.totalIssuesCount || 0} total issues`}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
