import React, { useMemo } from 'react';
import {
  useMediaQuery,
  Box,
  Typography,
  alpha,
  Tabs,
  Tab,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page } from '../components/layout';
import { TopMinersTable, LeaderboardSidebar, SEO } from '../components';
import { useAllMiners } from '../api';
import { parseNumber } from '../utils';
import theme from '../theme';

type LeaderboardMode = 'oss' | 'discovery';

const TopMinersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: LeaderboardMode =
    searchParams.get('mode') === 'discovery' ? 'discovery' : 'oss';

  const allMinerStatsQuery = useAllMiners();
  const allMinersStats = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  const handleModeChange = (
    _e: React.SyntheticEvent,
    next: LeaderboardMode,
  ) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'oss') p.delete('mode');
        else p.set('mode', 'discovery');
        return p;
      },
      { replace: true },
    );
  };

  const handleSelectMiner = (githubId: string) => {
    const path =
      mode === 'discovery' ? '/discoveries/details' : '/miners/details';
    const backLabel =
      mode === 'discovery' ? 'Back to Discoveries' : 'Back to Leaderboard';
    navigate(`${path}?githubId=${githubId}`, { state: { backLabel } });
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

  const discoveryStats = useMemo(() => {
    if (!Array.isArray(allMinersStats)) return [];
    return [...allMinersStats]
      .map((stat) => ({
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
        totalMergedPrs: Number(stat.totalSolvedIssues) || 0,
        totalOpenPrs: Number(stat.totalOpenIssues) || 0,
        totalClosedPrs: Number(stat.totalClosedIssues) || 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  }, [allMinersStats]);

  const activeStats = mode === 'discovery' ? discoveryStats : minerStats;

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
          sx={(theme) => ({
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
              backgroundColor: theme.palette.border.light,
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: theme.palette.border.medium,
              },
            },
          })}
        >
          <Tabs
            value={mode}
            onChange={handleModeChange}
            sx={{
              minHeight: 40,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              '& .MuiTab-root': {
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                textTransform: 'none',
                minHeight: 40,
                color: 'rgba(255,255,255,0.5)',
                '&.Mui-selected': { color: '#fff' },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#fff',
                height: 2,
              },
            }}
          >
            <Tab value="oss" label="OSS Contributions" />
            <Tab value="discovery" label="Issue Discovery" />
          </Tabs>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              color: (t) => alpha(t.palette.text.primary, 0.5),
              lineHeight: 1.6,
            }}
          >
            {mode === 'discovery'
              ? 'Miners earn discovery rewards by filing quality issues that others solve via merged PRs. Rewarded separately from OSS contributions.'
              : 'Miners earn OSS contribution rewards by getting pull requests merged into recognized repositories. Scored on code quality via AST token analysis. Rewarded separately from issue discovery.'}
          </Typography>
          <Box sx={{ width: '100%' }}>
            <TopMinersTable
              miners={activeStats}
              isLoading={isLoadingMinerStats}
              onSelectMiner={handleSelectMiner}
              activityLabel={mode === 'discovery' ? 'Issues' : undefined}
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
            miners={activeStats}
            onSelectMiner={handleSelectMiner}
            variant={mode === 'discovery' ? 'discoveries' : undefined}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default TopMinersPage;
