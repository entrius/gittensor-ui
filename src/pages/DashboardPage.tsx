import React from "react";
import { Stack, useMediaQuery, Box, Grid } from "@mui/material";
import { Page } from "../components/layout";
import { CommitTrendChart, RepositoriesTable, KpiCard, LiveCommitLog } from "../components";
import theme from "../theme";
import { useStats } from "../api";

const DashboardPage: React.FC = () => {
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("xl"));
  const showSidebarRight = useMediaQuery(theme.breakpoints.up("lg")); // Only show sidebar on right for large screens

  const { data: stats } = useStats();

  // Dynamic sidebar width based on screen size
  const sidebarWidth = isMobile || isTablet ? "100%" : isLargeScreen ? "340px" : "300px";

  return (
    <Page title="Dashboard">
      <Box
        sx={{
          width: "100%",
          height: showSidebarRight ? "calc(100vh - 64px)" : "auto",
          display: "flex",
          flexDirection: showSidebarRight ? "row" : "column",
          gap: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          overflow: "hidden",
        }}
      >
        {/* Main Content Area */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, sm: 1.5 },
            minHeight: 0,
            overflow: showSidebarRight ? "auto" : "visible",
            pr: showSidebarRight ? 1 : 0,
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              },
            },
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
          <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ flexShrink: 0 }}>
            <Grid item xs={12} sm={6} md={6} lg={3}>
              <KpiCard
                title="Total Commits"
                value={stats?.totalCommits}
                subtitle="Total PR snapshots"
                sx={{ height: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6} lg={3}>
              <KpiCard
                title="Issues Solved"
                value={stats?.totalIssues}
                subtitle="Problems resolved and closed"
                sx={{ height: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6} lg={3}>
              <KpiCard
                title="Lines Committed (Last 90 Days)"
                value={stats?.recentLinesChanged}
                subtitle="Recent activity"
                sx={{ height: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6} lg={3}>
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

        {/* Right Sidebar - Live Commit Log */}
        <Box
          sx={{
            width: showSidebarRight ? sidebarWidth : "100%",
            height: showSidebarRight ? "100%" : "700px",
            maxHeight: showSidebarRight ? "100%" : "700px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <LiveCommitLog />
        </Box>
      </Box>
    </Page>
  );
};

export default DashboardPage;
