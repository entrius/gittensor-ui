import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  alpha,
  Stack,
  Dialog,
  DialogTitle,
  DialogActions,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Page } from '../components/layout';
import { TopMinersTable, SEO } from '../components';
import { MinerComparisonRadar, COMPARISON_COLORS } from '../components/miners';
import { useAllMiners } from '../api';
import { mapAllMinersToStats } from '../utils/minerMapper';
import { useWatchlist } from '../hooks/useWatchlist';

const MAX_COMPARE = 4;

const WatchlistPage: React.FC = () => {
  const { ids, count, clear } = useWatchlist();
  const watchedSet = useMemo(() => new Set(ids), [ids]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const needsPicker = minerStats.length > MAX_COMPARE;

  const comparisonMiners = useMemo(() => {
    if (!needsPicker) return minerStats;
    const picked = selectedIds
      .map((id) => minerStats.find((m) => m.githubId === id))
      .filter((m): m is (typeof minerStats)[number] => Boolean(m));
    if (picked.length === 0) return minerStats.slice(0, MAX_COMPARE);
    return picked.slice(0, MAX_COMPARE);
  }, [minerStats, selectedIds, needsPicker]);

  const isEmpty = count === 0;
  const canCompare = minerStats.length >= 2;

  const handleClear = () => {
    clear();
    setConfirmOpen(false);
    setCompareOpen(false);
    setSelectedIds([]);
  };

  const toggleSelected = (githubId: string) => {
    setSelectedIds((prev) => {
      const current =
        prev.length > 0
          ? prev
          : minerStats.slice(0, MAX_COMPARE).map((m) => m.githubId);
      if (current.includes(githubId)) {
        return current.filter((id) => id !== githubId);
      }
      if (current.length >= MAX_COMPARE) return current;
      return [...current, githubId];
    });
  };

  const colorForMiner = (githubId: string) => {
    const idx = comparisonMiners.findIndex((m) => m.githubId === githubId);
    return idx >= 0 ? COMPARISON_COLORS[idx % COMPARISON_COLORS.length] : null;
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
          <Stack direction="row" spacing={1} alignItems="center">
            {canCompare && (
              <Button
                size="small"
                variant={compareOpen ? 'contained' : 'outlined'}
                onClick={() => setCompareOpen((v) => !v)}
                sx={{ fontSize: '0.75rem', textTransform: 'none' }}
              >
                {compareOpen ? 'Hide comparison' : 'Compare'}
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
          </Stack>
        </Stack>

        {compareOpen && canCompare && (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              backgroundColor: 'surface.subtle',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {needsPicker && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                  alignItems: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: (t) => alpha(t.palette.text.primary, 0.6),
                    mr: 0.5,
                  }}
                >
                  Pick up to {MAX_COMPARE}:
                </Typography>
                {minerStats.map((m) => {
                  const color = colorForMiner(m.githubId);
                  const active = Boolean(color);
                  return (
                    <Chip
                      key={m.githubId}
                      label={m.author || m.githubId}
                      size="small"
                      clickable
                      onClick={() => toggleSelected(m.githubId)}
                      sx={{
                        fontSize: '0.72rem',
                        height: 24,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: active
                          ? color!
                          : (t) => alpha(t.palette.common.white, 0.15),
                        backgroundColor: active ? `${color}22` : 'transparent',
                        color: active ? color! : 'text.secondary',
                        '&:hover': {
                          backgroundColor: active
                            ? `${color}33`
                            : (t) => alpha(t.palette.common.white, 0.05),
                        },
                      }}
                    />
                  );
                })}
              </Box>
            )}
            <MinerComparisonRadar
              miners={comparisonMiners}
              allMiners={allMinerStats}
            />
          </Paper>
        )}

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
