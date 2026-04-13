import React, { useMemo } from 'react';
import { useMediaQuery, Box, Typography, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Page } from '../components/layout';
import { TopMinersTable, LeaderboardSidebar, SEO } from '../components';
import { useAllMiners } from '../api';
import theme from '../theme';

const DiscoveriesPage: React.FC = () => {
  const navigate = useNavigate();

  const allMinerStatsQuery = useAllMiners();
  const allMinersStats = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  const handleSelectMiner = (githubId: string) => {
    navigate(`/discoveries/details?githubId=${githubId}`, {
      state: { backLabel: 'Back to Discoveries' },
    });
  };

  // Process miner stats for TopMinersTable, using issue discovery fields
  const minerStats = useMemo(() => {
    if (!Array.isArray(allMinersStats)) return [];
    return allMinersStats.map((stat) => ({
      id: String(stat.id),
      githubId: stat.githubId || '',
      author: stat.githubUsername || undefined,
      totalScore: Number(stat.issueDiscoveryScore) || 0,
      baseTotalScore: Number(stat.baseTotalScore) || 0,
      totalPRs:
        (Number(stat.totalSolvedIssues) || 0) +
        (Number(stat.totalClosedIssues) || 0),
      linesChanged: Number(stat.totalNodesScored) || 0,
      linesAdded: Number(stat.totalAdditions) || 0,
      linesDeleted: Number(stat.totalDeletions) || 0,
      hotkey: stat.hotkey || 'N/A',
      uniqueReposCount: Number(stat.uniqueReposCount) || 0,
      credibility: Number(stat.issueCredibility) || 0,
      isEligible: stat.isIssueEligible ?? false,
      usdPerDay: Number(stat.usdPerDay) || 0,
      // Issue counts mapped to PR status fields
      totalMergedPrs: Number(stat.totalSolvedIssues) || 0,
      totalOpenPrs: Number(stat.totalOpenIssues) || 0,
      totalClosedPrs: Number(stat.totalClosedIssues) || 0,
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
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              },
            },
          }}
        >
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
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
              onSelectMiner={handleSelectMiner}
              activityLabel="Issues"
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
            onSelectMiner={handleSelectMiner}
            variant="discoveries"
          />
        </Box>
      </Box>
    </Page>
  );
};

export default DiscoveriesPage;
