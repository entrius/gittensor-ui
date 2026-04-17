import React, { useMemo } from 'react';
import { useMediaQuery, Box, Typography, alpha } from '@mui/material';
import { Page } from '../components/layout';
import {
  TopMinersTable,
  LeaderboardSidebar,
  SEO,
  type MinerStats,
} from '../components';
import { useAllMiners } from '../api';
import { mapAllMinersToStats } from '../utils/minerMapper';
import theme, { scrollbarSx } from '../theme';

const MINER_LINK_STATE = { backLabel: 'Back to Leaderboard' } as const;
const getMinerHref = (miner: MinerStats) =>
  `/miners/details?githubId=${miner.githubId}`;

const TopMinersPage: React.FC = () => {
  const allMinerStatsQuery = useAllMiners();
  const allMinersStats = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  const minerStats = useMemo(
    () =>
      Array.isArray(allMinersStats) ? mapAllMinersToStats(allMinersStats) : [],
    [allMinersStats],
  );

  // Dashboard-like responsive logic
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const showSidebarRight = useMediaQuery(theme.breakpoints.up('xl'));

  // Dynamic sidebar width based on screen size (matching DashboardPage)
  const sidebarWidth =
    isMobile || isTablet ? '100%' : isLargeScreen ? '340px' : '300px';

  return (
    <Page title="Miner Leaderboard">
      <SEO
        title="Miner Leaderboard"
        description="Top contributors on Gittensor. View miner rankings, scores, and contribution statistics."
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
            minWidth: 0,
            pr: showSidebarRight ? 1 : 0,
            ...scrollbarSx,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.8rem',
              color: (t) => alpha(t.palette.text.primary, 0.5),
              lineHeight: 1.6,
            }}
          >
            Miners earn OSS contribution rewards by getting pull requests merged
            into recognized repositories. Scored on code quality via AST token
            analysis. Rewarded separately from issue discovery.
          </Typography>
          <Box sx={{ width: '100%' }}>
            <TopMinersTable
              miners={minerStats}
              isLoading={isLoadingMinerStats}
              getMinerHref={getMinerHref}
              linkState={MINER_LINK_STATE}
            />
          </Box>
        </Box>

        {/* Right Sidebar - Spacer to match Dashboard Live Activity */}
        <Box
          sx={{
            width: showSidebarRight ? sidebarWidth : '100%',
            height: showSidebarRight ? '100%' : 'auto',
            maxHeight: showSidebarRight ? '100%' : 'none', // Allow full height when stacked
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2, // Add gap for spacing when stacked
          }}
        >
          {/* Render extracted Sidebar Content here */}
          <LeaderboardSidebar
            miners={minerStats}
            getMinerHref={getMinerHref}
            linkState={MINER_LINK_STATE}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default TopMinersPage;
