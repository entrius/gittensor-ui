import React from "react";
import { Stack, useMediaQuery, Box, Grid } from "@mui/material";
import { Page } from "../components/layout";
import { CommitTrendChart, RepositoriesTable, KpiCard } from "../components";
import theme from "../theme";
import { useStats } from "../api";

const DashboardPage: React.FC = () => {
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const { data: stats } = useStats();

  return (
    <Page title="Dashboard">
      <Box
        sx={{
          width: "100%",
          maxWidth: "1400px",
          minHeight: isMobile ? "auto" : "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
          gap: { xs: 2, sm: 1.5 },
          py: { xs: 2, sm: 1 },
          mx: "auto",
          overflow: isMobile ? "visible" : "hidden",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, sm: 1.5 },
            flex: isMobile ? "0" : "1",
            minHeight: 0,
          }}
        >
          {/* Top Row: Focal Point - Total Lines Committed */}
          <Box sx={{ flexShrink: 0 }}>
            <KpiCard
              title="Total Lines Committed"
              value={stats?.totalLinesChanged}
              subtitle="Cumulative code contributions"
              variant="large"
            />
          </Box>

          {/* Middle Row: 4 KPI Cards - Responsive Grid */}
          <Grid container spacing={1.5} sx={{ flexShrink: 0 }}>
            <Grid item xs={12} sm={6}>
              <KpiCard
                title="Total Commits"
                value={stats?.totalCommits}
                subtitle="Total PR snapshots"
                sx={{ height: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <KpiCard
                title="Issues Solved"
                value={stats?.totalIssues}
                subtitle="Problems resolved and closed"
                sx={{ height: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <KpiCard
                title="Lines Committed (Last 90 Days)"
                value={stats?.recentLinesChanged}
                subtitle="Recent activity"
                sx={{ height: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <KpiCard
                title="Total Unique Repositories"
                value={stats?.uniqueRepositories}
                subtitle="Projects contributed to"
                sx={{ height: "100%" }}
              />
            </Grid>
          </Grid>

          {/* Bottom Section: Chart and Table Stacked */}
          <Box sx={{ 
            width: "100%", 
            display: "flex", 
            flexDirection: "column", 
            gap: 1.5, 
            minHeight: isMobile ? "600px" : 0,
            flexShrink: 0,
          }}>
            {/* Chart */}
            <Box sx={{ 
              width: "100%", 
              height: isMobile ? "350px" : "400px", 
              flexShrink: 0, 
              minHeight: isMobile ? "350px" : "400px" 
            }}>
              <CommitTrendChart />
            </Box>

            {/* Table */}
            <Box sx={{ 
              width: "100%", 
              minHeight: isMobile ? "400px" : 0, 
              height: isMobile ? "400px" : "auto",
              overflow: "hidden" 
            }}>
              <RepositoriesTable />
            </Box>
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default DashboardPage;
