import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Tabs,
  Tab,
  alpha,
  useMediaQuery,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { useAllMiners, useReposAndWeights } from '../api';
import { parseNumber } from '../utils';
import { usePulseBoard } from '../hooks/usePulseBoard';
import { PulseCard } from '../components/compare/PulseCard';
import { GapMatrix } from '../components/compare/GapMatrix';
import { LiveBetsFeed } from '../components/compare/LiveBetsFeed';
import { FrontierFinder } from '../components/compare/FrontierFinder';
import { StrategyFingerprint } from '../components/compare/StrategyFingerprint';
import { TerritoryGrid } from '../components/compare/TerritoryGrid';
import { useWatchlistIntel } from '../hooks/useWatchlistIntel';
import theme, { scrollbarSx } from '../theme';

type CompareTab = 'overview' | 'territory' | 'bets' | 'strategy' | 'frontier';

const tabSx = {
  '& .MuiTab-root': {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.78rem',
    textTransform: 'none' as const,
    fontWeight: 600,
    color: 'text.secondary',
    minHeight: 40,
    '&.Mui-selected': { color: 'text.primary' },
  },
  '& .MuiTabs-indicator': { backgroundColor: 'text.primary', height: 2 },
};

const ComparePage: React.FC = () => {
  const { pinned, pinnedCount, snapshots, takeSnapshot } = usePulseBoard();
  const [activeTab, setActiveTab] = useState<CompareTab>('overview');

  const allMinerStatsQuery = useAllMiners();
  const allMinersStats = allMinerStatsQuery?.data;

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Normalize all miners
  const allNormalized = useMemo(() => {
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
      rank: rankById.get(String(stat.id)) ?? 0,
      credibility: parseNumber(stat.credibility),
      isEligible: stat.isEligible ?? false,
      usdPerDay: parseNumber(stat.usdPerDay),
      totalMergedPrs: parseNumber(stat.totalMergedPrs),
      totalSolvedIssues: parseNumber(stat.totalSolvedIssues),
    }));
  }, [allMinersStats]);

  // Filter to pinned miners
  const pinnedMiners = useMemo(() => {
    const minerMap = new Map(allNormalized.map((m) => [m.githubId, m]));
    return pinned
      .map((id) => minerMap.get(id))
      .filter(Boolean) as typeof allNormalized;
  }, [allNormalized, pinned]);

  // Territory Intel
  const { territoryMap, liveBets, fingerprints, isLoading: isIntelLoading } =
    useWatchlistIntel(pinned);

  // Fetch real repo weights and enrich territory map
  const { data: repoWeights } = useReposAndWeights();
  const enrichedTerritoryMap = useMemo(() => {
    if (!repoWeights) return territoryMap;
    const weightLookup = new Map(
      repoWeights.map((r) => [r.fullName, parseFloat(String(r.weight ?? '0'))]),
    );
    for (const [name, territory] of territoryMap) {
      const realWeight = weightLookup.get(name);
      if (realWeight !== undefined && realWeight > territory.weight) {
        territory.weight = realWeight;
      }
    }
    return territoryMap;
  }, [territoryMap, repoWeights]);

  // Name map: githubId → display name (from pinned miners data)
  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of pinnedMiners) {
      if (m.author) map.set(m.githubId, m.author);
    }
    // Also pick up names from territory presence entries
    for (const t of enrichedTerritoryMap.values()) {
      for (const p of t.presence) {
        if (p.author && !map.has(p.githubId)) {
          map.set(p.githubId, p.author);
        }
      }
    }
    return map;
  }, [pinnedMiners, enrichedTerritoryMap]);

  // Snapshot on mount
  useEffect(() => {
    if (pinnedMiners.length > 0) {
      takeSnapshot(pinnedMiners);
    }
  }, [pinnedMiners, takeSnapshot]);

  // GapMatrix data
  const gapMiners = useMemo(
    () =>
      pinnedMiners.map((m) => ({
        githubId: m.githubId,
        username: m.author || m.githubId,
        totalScore: m.totalScore,
        rank: m.rank,
        credibility: m.credibility,
        totalMergedPrs: m.totalMergedPrs,
        totalSolvedIssues: m.totalSolvedIssues,
        usdPerDay: m.usdPerDay,
      })),
    [pinnedMiners],
  );

  const isEmpty = pinnedCount === 0;

  return (
    <Page title="Pulse Board">
      <SEO
        title="Pulse Board — Territory Intel"
        description="Compare pinned miners, map repository territory, track live bets, and discover uncontested repos."
      />
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, md: 2.5 },
          py: { xs: 2, md: 3 },
          px: { xs: 2, md: 3 },
          overflow: 'auto',
          ...scrollbarSx,
          pb: '64px',
        }}
      >
        {/* Header */}
        <Box>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            Pulse Board
          </Typography>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.78rem',
              color: (t) => alpha(t.palette.text.primary, 0.5),
            }}
          >
            {isEmpty
              ? 'Pin miners from the leaderboard to compare them here.'
              : `Tracking ${pinnedCount} ${pinnedCount === 1 ? 'miner' : 'miners'} — deltas since your last visit.`}
          </Typography>
        </Box>

        {isEmpty ? (
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.95rem',
                color: 'text.secondary',
              }}
            >
              No miners pinned yet.
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8rem',
                maxWidth: 480,
                color: (t) => alpha(t.palette.text.primary, 0.5),
              }}
            >
              Open the leaderboard and click the pin icon on up to 4 miners.
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
          <>
            {/* Tab Navigation */}
            <Tabs
              value={activeTab}
              onChange={(_e, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={tabSx}
            >
              <Tab value="overview" label="Overview" />
              <Tab value="territory" label="Territory" />
              <Tab value="bets" label="Live Bets" />
              <Tab value="strategy" label="Strategy" />
              <Tab value="frontier" label="Frontier" />
            </Tabs>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <Grid container spacing={2}>
                  {pinnedMiners.map((miner) => (
                    <Grid
                      key={miner.githubId}
                      item
                      xs={12}
                      sm={6}
                      md={
                        pinnedCount <= 2
                          ? 6
                          : pinnedCount === 3
                            ? 4
                            : 3
                      }
                    >
                      <PulseCard
                        miner={miner}
                        snapshot={snapshots[miner.githubId]}
                      />
                    </Grid>
                  ))}
                </Grid>
                <GapMatrix miners={gapMiners} />
              </Box>
            )}

            {/* Territory Tab */}
            {activeTab === 'territory' && (
              <TerritoryGrid
                territoryMap={enrichedTerritoryMap}
                pinnedIds={pinned}
                nameMap={nameMap}
                isLoading={isIntelLoading}
              />
            )}

            {/* Live Bets Tab */}
            {activeTab === 'bets' && (
              <LiveBetsFeed
                bets={liveBets}
                isLoading={isIntelLoading}
              />
            )}

            {/* Strategy Tab */}
            {activeTab === 'strategy' && (
              <StrategyFingerprint
                fingerprints={fingerprints}
                isLoading={isIntelLoading}
              />
            )}

            {/* Frontier Tab */}
            {activeTab === 'frontier' && (
              <FrontierFinder
                territoryMap={enrichedTerritoryMap}
                isLoading={isIntelLoading}
              />
            )}
          </>
        )}
      </Box>
    </Page>
  );
};

export default ComparePage;
