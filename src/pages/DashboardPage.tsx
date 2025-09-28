import React from "react";
import { Stack, useMediaQuery } from "@mui/material";
import { Page } from "../components/layout";
import { CommitTrendChart, RepositoriesTable, KpiCard } from "../components";
import { Repository } from "../components";
import theme from "../theme";

const DashboardPage: React.FC = () => {
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Mock data - can be replaced with API call
  const repositories: Repository[] = [
    {
      id: "1",
      name: "gittensor-core",
      url: "https://github.com/gittensor/gittensor-core",
      totalCommits: 156,
      linesAdded: 12450,
      linesRemoved: 3200,
    },
    {
      id: "2",
      name: "mining-algorithms",
      url: "https://github.com/gittensor/mining-algorithms",
      totalCommits: 89,
      linesAdded: 8900,
      linesRemoved: 1200,
    },
    {
      id: "3",
      name: "validator-network",
      url: "https://github.com/gittensor/validator-network",
      totalCommits: 203,
      linesAdded: 15600,
      linesRemoved: 4800,
    },
    {
      id: "4",
      name: "ui-components",
      url: "https://github.com/gittensor/ui-components",
      totalCommits: 67,
      linesAdded: 5800,
      linesRemoved: 900,
    },
    {
      id: "5",
      name: "documentation",
      url: "https://github.com/gittensor/documentation",
      totalCommits: 34,
      linesAdded: 2900,
      linesRemoved: 432,
    },
  ];

  const totalLinesChanged = 45782;
  const linesLast90Days = 12485;
  const totalRepositories = repositories.length;
  const issuesSolved = 127;

  return (
    <Page title="Dashboard">
      <Stack gap={4}>
        <Stack direction={isMobile ? "column" : "row"} gap={3}>
          <KpiCard
            title="Total Lines Committed"
            value={totalLinesChanged}
            subtitle="Cumulative code contributions"
            variant="large"
          />
          <KpiCard
            title="Issues Solved"
            value={issuesSolved}
            subtitle="Problems resolved and closed"
            variant="large"
          />
        </Stack>

        <Stack direction={isMobile ? "column" : "row"} spacing={3}>
          <KpiCard
            title="Lines Committed (Last 90 Days)"
            value={linesLast90Days}
            subtitle="Recent activity"
          />
          <KpiCard
            title="Total Unique Repositories"
            value={totalRepositories}
            subtitle="Projects contributed to"
          />
        </Stack>

        {!isMobile && <CommitTrendChart />}

        <RepositoriesTable repositories={repositories} />
      </Stack>
    </Page>
  );
};

export default DashboardPage;
