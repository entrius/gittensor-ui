import React, { useMemo } from 'react';
import {
  useMediaQuery,
  Box,
  Typography,
  Button,
  alpha,
  Stack,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Page } from '../components/layout';
import { TopMinersTable, SEO } from '../components';
import { useAllMiners } from '../api';
import { parseNumber } from '../utils';
import { useWatchlist } from '../hooks/useWatchlist';
import theme, { scrollbarSx } from '../theme';

const WatchlistPage: React.FC = () => {
  const { ids, count, clear } = useWatchlist();
  const watchedSet = useMemo(() => new Set(ids), [ids]);

  const allMinerStatsQuery = useAllMiners();
  const allMinersStats = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  const minerStats = useMemo(() => {
    if (!Array.isArray(allMinersStats)) return [];

    const rankById = new Map(
      [...allMinersStats]
        .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
        .map((stat, index) => [String(stat.id), index + 1]),
    );

    return allMinersStats
      .filter((stat) => watchedSet.has(stat.githubId || ''))
      .map((stat) => ({
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
        totalMergedPrs: parseNumber(stat.totalMergedPrs),
        totalOpenPrs: parseNumber(stat.totalOpenPrs),
        totalClosedPrs: parseNumber(stat.totalClosedPrs),
      }));
  }, [allMinersStats, watchedSet]);

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const showSidebarRight = useMediaQuery(theme.breakpoints.up('xl'));
  const sidebarWidth =
    isMobile || isTablet ? '100%' : isLargeScreen ? '340px' : '300px';

  const isEmpty = count === 0;

  return (
    <Page title="Watchlist">
      <SEO
        title="Watchlist"
        description="Your pinned miners on Gittensor. Quickly revisit the miners you're tracking."
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
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                color: (t) => alpha(t.palette.text.primary, 0.5),
                lineHeight: 1.6,
              }}
            >
              Your watchlist — {count}{' '}
              {count === 1 ? 'miner pinned' : 'miners pinned'}. Stored locally
              in this browser.
            </Typography>
            {count > 0 && (
              <Button
                size="small"
                onClick={clear}
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  color: 'text.secondary',
                }}
              >
                Clear watchlist
              </Button>
            )}
          </Stack>

          {isEmpty ? (
            <Box
              sx={{
                py: 8,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                alignItems: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.95rem',
                }}
              >
                Your watchlist is empty.
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.8rem',
                  maxWidth: 480,
                  color: (t) => alpha(t.palette.text.primary, 0.5),
                }}
              >
                Browse the leaderboard and star miners you want to track.
                Pinned miners appear here across reloads and tabs.
              </Typography>
              <Button
                component={RouterLink}
                to="/top-miners"
                variant="outlined"
                size="small"
                sx={{ textTransform: 'none', mt: 1 }}
              >
                Go to leaderboard
              </Button>
            </Box>
          ) : (
            <Box sx={{ width: '100%' }}>
              <TopMinersTable
                miners={minerStats}
                isLoading={isLoadingMinerStats}
                getHref={(m) =>
                  `/miners/details?githubId=${encodeURIComponent(m.githubId)}`
                }
                linkState={{ backLabel: 'Back to Watchlist' }}
              />
            </Box>
          )}
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
        />
      </Box>
    </Page>
  );
};

export default WatchlistPage;
