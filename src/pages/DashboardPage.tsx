import React from 'react';
import { useMediaQuery, Box, Grid } from '@mui/material';
import { Page } from '../components/layout';
import {
  LeaderboardCharts,
  RepositoriesTable,
  KpiCard,
  LiveCommitLog,
  SEO,
  GlobalActivity,
} from '../components';
import theme, { scrollbarSx } from '../theme';
import { useStats } from '../api';
import CommitTrendChart from '../components/dashboard/CommitTrendChart';

const DashboardPage: React.FC = () => {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const showSidebarRight = useMediaQuery(theme.breakpoints.up('xl')); // Only show sidebar on right for extra large screens

  const { data: stats } = useStats();

  // Dynamic sidebar width based on screen size
  const sidebarWidth =
    isMobile || isTablet ? '100%' : isLargeScreen ? '340px' : '300px';

  return (
    <Page title="Dashboard">
      <SEO
        title="Dashboard"
        description="View real-time statistics, commit trends, and network performance for Gittensor."
      />
      <Box
        sx={{
          width: '100%',
          height: showSidebarRight ? 'calc(100vh - 64px)' : 'auto',
          display: 'flex',
          flexDirection: showSidebarRight ? 'row' : 'column',
          gap: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          overflow: 'hidden',
        }}
      >
        {/* Main Content Area */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 1.5 },
            minHeight: 0,
            overflow: showSidebarRight ? 'auto' : 'visible',
            minWidth: 0, // Add minWidth to fix flex overflow issues
            pr: showSidebarRight ? 1 : 0,
            ...scrollbarSx,
          }}
        >
          {/* Top Row: Global Activity Viz */}
          <Box sx={{ width: '100%' }}>
            <GlobalActivity />
          </Box>

          {/* KPI Cards - Summary Stats (Above-the-fold) */}
          <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ flexShrink: 0 }}>
            <Grid item xs={12} sm={6} md={6} lg={6} xl={3}>
              <KpiCard
                title="Total Commits"
                value={stats?.totalCommits}
                subtitle="Total PR snapshots"
                sx={{ height: '100%' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6} lg={6} xl={3}>
              <KpiCard
                title="Issues Solved"
                value={stats?.totalIssues}
                subtitle="Problems resolved and closed"
                sx={{ height: '100%' }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={6} lg={6} xl={3}>
              <KpiCard
                title="Lines Changed"
                value={stats?.totalLinesChanged}
                subtitle="Cumulative diff volume"
                sx={{ height: '100%' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6} lg={6} xl={3}>
              <KpiCard
                title="Total Repositories"
                value={stats?.uniqueRepositories}
                subtitle="Projects contributed to"
                sx={{ height: '100%' }}
              />
            </Grid>
          </Grid>

          {/* Charts and Table Section */}
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              minHeight: isMobile ? '600px' : 0,
              flexShrink: 0,
            }}
          >
            {/* Leaderboard + Trend (Denser layout on large screens) */}
            <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ width: '100%' }}>
              <Grid item xs={12} lg={7}>
                <Box
                  sx={{
                    width: '100%',
                    height: isMobile ? '500px' : '550px',
                    flexShrink: 0,
                    minHeight: isMobile ? '500px' : '550px',
                  }}
                >
                  <LeaderboardCharts />
                </Box>
              </Grid>
              <Grid item xs={12} lg={5}>
                <Box
                  sx={{
                    width: '100%',
                    height: isMobile ? '320px' : '550px',
                    minHeight: isMobile ? '320px' : '550px',
                  }}
                >
                  <CommitTrendChart />
                </Box>
              </Grid>
            </Grid>

            {/* Table */}
            <Box
              sx={{
                width: '100%',
                minHeight: isMobile ? '400px' : 0,
                height: isMobile ? '400px' : 'auto',
                overflow: 'hidden',
              }}
            >
              <RepositoriesTable />
            </Box>
          </Box>
        </Box>

        {/* Right Sidebar - Live Commit Log */}
        <Box
          sx={{
            width: showSidebarRight ? sidebarWidth : '100%',
            height: showSidebarRight ? '100%' : '700px',
            maxHeight: showSidebarRight ? '100%' : '700px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <LiveCommitLog />
        </Box>
      </Box>
    </Page>
  );
};

export default DashboardPage;
