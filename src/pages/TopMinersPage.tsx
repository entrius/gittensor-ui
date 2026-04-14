import React, { useMemo } from 'react';
import { useMediaQuery, Box, Typography, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Page } from '../components/layout';
import { TopMinersTable, LeaderboardSidebar, SEO } from '../components';
import { useAllMiners } from '../api';
import { parseNumber } from '../utils';
import theme from '../theme';

const TopMinersPage: React.FC = () => {
  const navigate = useNavigate();

  const allMinerStatsQuery = useAllMiners();
  const allMinersStats = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  const handleSelectMiner = (githubId: string) => {
    navigate(`/miners/details?githubId=${githubId}`, {
      state: { backLabel: 'Back to Leaderboard' },
    });
  };

  // Normalize leaderboard miner data.
  const minerStats = useMemo(() => {
    if (!Array.isArray(allMinersStats)) return [];

    const rankById = new Map(
      [...allMinersStats]
        .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
        .map((stat, index) => [String(stat.id), index + 1]),
    );

    return allMinersStats.map((stat) => ({
      id: String(stat.id),
      githubId: stat.githubId || '',
      author: stat.githubUsername || undefined,
      totalScore: parseNumber(stat.totalScore),
      baseTotalScore: parseNumber(stat.baseTotalScore),
      totalPRs: parseNumber(stat.totalPrs),
      linesChanged: parseNumber(stat.totalNodesScored),
      linesAdded: parseNumber(stat.totalAdditions),
      linesDeleted: parseNumber(stat.totalDeletions),
      hotkey: stat.hotkey || 'N/A',
      rank: rankById.get(String(stat.id)),
      uniqueReposCount: parseNumber(stat.uniqueReposCount),
      credibility: parseNumber(stat.credibility),
      isEligible: stat.isEligible ?? false,
      usdPerDay: parseNumber(stat.usdPerDay),
      // PR status counts for credibility donut
      totalMergedPrs: parseNumber(stat.totalMergedPrs),
      totalOpenPrs: parseNumber(stat.totalOpenPrs),
      totalClosedPrs: parseNumber(stat.totalClosedPrs),
    }));
  }, [allMinersStats]);

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
          height: 'auto',
          display: 'flex',
          flexDirection: showSidebarRight ? 'row' : 'column',
          gap: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },

        }}
      >
        {/* Main Content Area */}
        <Box
          sx={(theme) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 1.5 },
            minHeight: 0,
            overflow: 'visible',
            minWidth: 0,
            pr: showSidebarRight ? 1 : 0,
          })}
        >
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
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
              onSelectMiner={handleSelectMiner}
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
            onSelectMiner={handleSelectMiner}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default TopMinersPage;
