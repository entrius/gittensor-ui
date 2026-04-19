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
import theme, { scrollbarSx } from '../theme';
import { parseNumber } from '../utils/ExplorerUtils';

const MINER_LINK_STATE = { backLabel: 'Back to Discoveries' } as const;
const getMinerHref = (miner: MinerStats) =>
  `/miners/details?githubId=${miner.githubId}&mode=issues`;

const DiscoveriesPage: React.FC = () => {
  const allMinerStatsQuery = useAllMiners();
  const allMinersStats = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  // Process miner stats for TopMinersTable, using issue discovery fields
  const minerStats = useMemo(() => {
    if (!Array.isArray(allMinersStats)) return [];
    return allMinersStats.map((stat) => ({
      id: String(stat.id),
      githubId: stat.githubId || '',
      author: stat.githubUsername || undefined,
      totalScore: parseNumber(stat.issueDiscoveryScore),
      baseTotalScore: parseNumber(stat.baseTotalScore),
      totalPRs: parseNumber(stat.totalPrs),
      totalIssues:
        parseNumber(stat.totalSolvedIssues) +
        parseNumber(stat.totalOpenIssues) +
        parseNumber(stat.totalClosedIssues),
      linesChanged: parseNumber(stat.totalNodesScored),
      linesAdded: parseNumber(stat.totalAdditions),
      linesDeleted: parseNumber(stat.totalDeletions),
      hotkey: stat.hotkey || 'N/A',
      uniqueReposCount: parseNumber(stat.uniqueReposCount),
      issueCredibility: parseNumber(stat.issueCredibility),
      isEligible: stat.isIssueEligible ?? false,
      ossIsEligible: stat.isEligible ?? false,
      discoveriesIsEligible: stat.isIssueEligible ?? false,
      usdPerDay: parseNumber(stat.usdPerDay),
      totalMergedPrs: parseNumber(stat.totalMergedPrs),
      totalOpenPrs: parseNumber(stat.totalOpenPrs),
      totalClosedPrs: parseNumber(stat.totalClosedPrs),
      totalSolvedIssues: parseNumber(stat.totalSolvedIssues),
      totalOpenIssues: parseNumber(stat.totalOpenIssues),
      totalClosedIssues: parseNumber(stat.totalClosedIssues),
    }));
  }, [allMinersStats]);

  // Sort miners by issue discovery score
  const sortedMinerStats = useMemo(
    () => [...minerStats].sort((a, b) => b.totalScore - a.totalScore),
    [minerStats],
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
    <Page title="Issue Discoveries">
      <SEO
        title="Issue Discoveries"
        description="Issue discovery rankings on Gittensor. View miner scores for discovering and solving issues."
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
            Miners earn discovery rewards by filing quality issues that others
            solve via merged PRs. Rewarded separately from OSS contributions.
          </Typography>
          <Box sx={{ width: '100%' }}>
            <TopMinersTable
              miners={sortedMinerStats}
              isLoading={isLoadingMinerStats}
              getMinerHref={getMinerHref}
              linkState={MINER_LINK_STATE}
              variant="discoveries"
            />
          </Box>
        </Box>

        {/* Right Sidebar */}
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
            getMinerHref={getMinerHref}
            linkState={MINER_LINK_STATE}
            variant="discoveries"
          />
        </Box>
      </Box>
    </Page>
  );
};

export default DiscoveriesPage;
