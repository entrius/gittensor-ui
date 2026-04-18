import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  alpha,
  Stack,
  Dialog,
  DialogTitle,
  DialogActions,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { usePulseBoard } from '../hooks/usePulseBoard';
import { Page } from '../components/layout';
import { TopMinersTable, SEO } from '../components';
import { useAllMiners } from '../api';
import { mapAllMinersToStats } from '../utils/minerMapper';
import { useWatchlist } from '../hooks/useWatchlist';

const WatchlistPage: React.FC = () => {
  const { ids, count, clear } = useWatchlist();
  const { pinnedCount } = usePulseBoard();
  const watchedSet = useMemo(() => new Set(ids), [ids]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allMinerStatsQuery = useAllMiners();
  const allMinersStats = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  const allMinerStats = useMemo(
    () => mapAllMinersToStats(allMinersStats ?? []),
    [allMinersStats],
  );
  const minerStats = useMemo(
    () =>
      allMinerStats
        .filter((m) => watchedSet.has(m.githubId))
        .map((m) => ({
          ...m,
          // Watchlist cards should be enabled if miner is eligible for either
          // OSS contributions or Issue Discoveries.
          isEligible: Boolean(m.ossIsEligible || m.discoveriesIsEligible),
        })),
    [allMinerStats, watchedSet],
  );

  const isEmpty = count === 0;

  const handleClear = () => {
    clear();
    setConfirmOpen(false);
  };

  return (
    <Page title="Watchlist">
      <SEO
        title="Watchlist"
        description="Your pinned miners on Gittensor. Quickly revisit the miners you're tracking."
      />
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 1.5 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
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
              fontSize: '0.8rem',
              color: (t) => alpha(t.palette.text.primary, 0.5),
              lineHeight: 1.6,
            }}
          >
            Your watchlist — {count}{' '}
            {count === 1 ? 'miner pinned' : 'miners pinned'}. Stored locally in
            this browser.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {pinnedCount > 0 && (
              <Button
                component={RouterLink}
                to="/compare"
                size="small"
                variant="outlined"
                startIcon={
                  <CompareArrowsIcon sx={{ fontSize: '1rem !important' }} />
                }
                sx={{
                  fontSize: '0.75rem',
                  textTransform: 'none',
                }}
              >
                Compare ({pinnedCount})
              </Button>
            )}
            {count > 0 && (
              <Button
                size="small"
                onClick={() => setConfirmOpen(true)}
                sx={{
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  color: 'text.secondary',
                }}
              >
                Clear watchlist
              </Button>
            )}
          </Box>
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
                fontSize: '0.95rem',
              }}
            >
              Your watchlist is empty.
            </Typography>
            <Typography
              sx={{
                fontSize: '0.8rem',
                maxWidth: 480,
                color: (t) => alpha(t.palette.text.primary, 0.5),
              }}
            >
              Browse the leaderboard and star miners you want to track. Pinned
              miners appear here across reloads and tabs.
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
              getMinerHref={(m) =>
                `/miners/details?githubId=${encodeURIComponent(m.githubId)}`
              }
              linkState={{ backLabel: 'Back to Watchlist' }}
              variant="watchlist"
              showDualEligibilityBadges
            />
          </Box>
        )}
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Clear all {count} pinned miners?</DialogTitle>
        <DialogActions>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClear}
            color="error"
            sx={{ textTransform: 'none' }}
          >
            Clear watchlist
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
};

export default WatchlistPage;
