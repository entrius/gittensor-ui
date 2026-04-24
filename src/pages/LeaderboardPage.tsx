import React, { useMemo } from 'react';
import { Box, Typography, alpha, useMediaQuery } from '@mui/material';
import { Page } from '../components/layout';
import {
  LeaderboardSidebar,
  SEO,
  TopMinersTable,
  type MinerStats,
} from '../components';
import { useAllMiners } from '../api';
import { mapAllMinersToStats } from '../utils/minerMapper';
import theme, { scrollbarSx } from '../theme';

const MINER_LINK_STATE = { backLabel: 'Back to Leaderboard' } as const;

const getMinerHref = (miner: MinerStats) =>
  `/miners/details?githubId=${miner.githubId}`;

const LeaderboardPage: React.FC = () => {
  const allMinerStatsQuery = useAllMiners();
  const allMinersStats = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  const minerStats = useMemo(
    () =>
      Array.isArray(allMinersStats) ? mapAllMinersToStats(allMinersStats) : [],
    [allMinersStats],
  );

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const showSidebarRight = useMediaQuery(theme.breakpoints.up('xl'));

  const sidebarWidth =
    isMobile || isTablet ? '100%' : isLargeScreen ? '340px' : '300px';

  return (
    <Page title="Leaderboard">
      <SEO
        title="Leaderboard"
        description="Gittensor leaderboard across OSS contributions and discoveries."
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
            Compare OSS contribution rewards and discovery rewards in one place.
            Score and Credibility can be sorted by either program.
          </Typography>

          <TopMinersTable
            miners={minerStats}
            isLoading={isLoadingMinerStats}
            getMinerHref={(m) => getMinerHref(m)}
            linkState={MINER_LINK_STATE}
            variant="watchlist"
            mode="leaderboard"
            showDualEligibilityBadges
          />
        </Box>

        <Box
          sx={{
            width: showSidebarRight ? sidebarWidth : '100%',
            height: showSidebarRight ? '100%' : 'auto',
            maxHeight: showSidebarRight ? '100%' : 'none',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <LeaderboardSidebar
            miners={minerStats}
            getMinerHref={(m) => getMinerHref(m)}
            linkState={MINER_LINK_STATE}
            variant="watchlist"
          />
        </Box>
      </Box>
    </Page>
  );
};

export default LeaderboardPage;
