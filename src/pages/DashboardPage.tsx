import React from "react";
import { Stack, useMediaQuery } from "@mui/material";
import { Page } from "../components/layout";
import { CommitTrendChart, RepositoriesTable, KpiCard } from "../components";
import theme from "../theme";
import { useStats } from "../api";

const DashboardPage: React.FC = () => {
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data: stats, isLoading } = useStats();

  return (
    <Page title="Dashboard">
      <Stack gap={4}>
        <Stack direction={isMobile ? "column" : "row"} gap={3}>
          <KpiCard
            title="Total Lines Committed"
            value={stats?.totalLinesChanged}
            subtitle="Cumulative code contributions"
            variant="large"
          />
          <KpiCard
            title="Issues Solved"
            value={stats?.totalIssues}
            subtitle="Problems resolved and closed"
            variant="large"
          />
        </Stack>

        <Stack direction={isMobile ? "column" : "row"} spacing={3}>
          <KpiCard
            title="Lines Committed (Last 90 Days)"
            value={stats?.recentLinesChanged}
            subtitle="Recent activity"
          />
          <KpiCard
            title="Total Unique Repositories"
            value={stats?.uniqueRepositories}
            subtitle="Projects contributed to"
          />
        </Stack>

        {!isMobile && <CommitTrendChart />}

        <RepositoriesTable />
      </Stack>
    </Page>
  );
};

export default DashboardPage;
