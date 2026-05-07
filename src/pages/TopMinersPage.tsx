import React, { useMemo, useCallback } from 'react';
import { useTwitterStickySidebar } from '../hooks/useTwitterStickySidebar';
import { useMediaQuery, Box, alpha, Tabs, Tab } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { Page } from '../components/layout';
import {
  TopMinersTable,
  LeaderboardSidebar,
  SEO,
  type MinerStats,
} from '../components';
import { useAllMiners } from '../api';
import { mapAllMinersToStats } from '../utils/minerMapper';
import { parseNumber } from '../utils/ExplorerUtils';
import theme from '../theme';

/* ─── Timeline tab definitions ────────────────────────────────── */

type TimelineTab = 'oss' | 'discoveries';

const TIMELINE_ORDER: readonly TimelineTab[] = ['oss', 'discoveries'] as const;

const TIMELINE_LABELS: Record<TimelineTab, string> = {
  oss: 'Leaderboard',
  discoveries: 'Discoveries',
};

const TIMELINE_PARAM = 'timeline';

const parseTimeline = (raw: string | null): TimelineTab =>
  TIMELINE_ORDER.includes(raw as TimelineTab) ? (raw as TimelineTab) : 'oss';

/* ─── Miner href helpers ──────────────────────────────────────── */

const OSS_LINK_STATE = { backLabel: 'Back to Leaderboard' } as const;
const DISC_LINK_STATE = { backLabel: 'Back to Discoveries' } as const;

const getOssMinerHref = (miner: MinerStats) =>
  `/miners/details?githubId=${miner.githubId}`;
const getDiscMinerHref = (miner: MinerStats) =>
  `/miners/details?githubId=${miner.githubId}&mode=issues&tab=open-issues`;

/* ─── Page component ──────────────────────────────────────────── */

const TopMinersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTimeline = parseTimeline(searchParams.get(TIMELINE_PARAM));

  /* ─ Shared data ─ */
  const allMinerStatsQuery = useAllMiners();
  const allMinersRaw = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  /* OSS miner stats */
  const ossMinerStats = useMemo(
    () =>
      Array.isArray(allMinersRaw) ? mapAllMinersToStats(allMinersRaw) : [],
    [allMinersRaw],
  );

  /* Discoveries miner stats (issue-discovery scoring) */
  const discMinerStats = useMemo(() => {
    if (!Array.isArray(allMinersRaw)) return [];
    return allMinersRaw.map((stat) => ({
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
  }, [allMinersRaw]);

  const sortedDiscMinerStats = useMemo(
    () => [...discMinerStats].sort((a, b) => b.totalScore - a.totalScore),
    [discMinerStats],
  );

  /* ─ Responsive layout ─ */
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const showSidebarRight = useMediaQuery(theme.breakpoints.up('xl'));
  const stickySidebarRef = useTwitterStickySidebar();
  const sidebarWidth =
    isMobile || isTablet ? '100%' : isLargeScreen ? '340px' : '300px';

  /* ─ Timeline tab switching ─ */
  const handleTimelineChange = useCallback(
    (_event: React.SyntheticEvent, next: unknown) => {
      const validated = parseTimeline(String(next));
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (validated === 'oss') {
            params.delete(TIMELINE_PARAM);
          } else {
            params.set(TIMELINE_PARAM, validated);
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /* ─ SEO per-tab ─ */
  const seoTitle =
    activeTimeline === 'discoveries' ? 'Issue Discoveries' : 'Leaderboard';

  const seoDescription =
    activeTimeline === 'discoveries'
      ? 'Issue discovery rankings on Gittensor. View miner scores for discovering and solving issues.'
      : 'Top contributors on Gittensor. View miner rankings, scores, and contribution statistics.';

  const optionsPortalTarget = useMemo(
    () => (
      <Box
        id="tabs-options-portal"
        sx={{
          display: 'none',
          '@media (min-width: 1536px)': {
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'border.light',
            backgroundColor: 'background.default',
          },
        }}
      />
    ),
    [],
  );

  return (
    <Page title={seoTitle}>
      <SEO title={seoTitle} description={seoDescription} />
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: showSidebarRight ? 'row' : 'column',
          alignItems: showSidebarRight ? 'flex-start' : 'stretch',
          gap: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
        }}
      >
        {/* Main Content Area */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 1.5 },
            minWidth: 0,
            pr: showSidebarRight ? 1 : 0,
            // Prevent the sidebar from driving page scroll when main content
            // is short (e.g. filtered to eligible-only).
            minHeight: showSidebarRight ? 'calc(100vh - 88px)' : 'auto',
          }}
        >
          {/* ─── Twitter-style timeline tabs ─── */}
          <Box
            sx={{
              borderBottom: '1px solid',
              borderColor: 'border.light',
              position: 'sticky',
              top: 64,
              zIndex: 50,
              backgroundColor: (t) => alpha(t.palette.background.default, 0.85),
              backdropFilter: 'blur(12px)',
            }}
          >
            <Tabs
              value={activeTimeline}
              onChange={handleTimelineChange}
              variant="fullWidth"
              sx={(t) => ({
                minHeight: 52,
                '& .MuiTab-root': {
                  minHeight: 52,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: '0.01em',
                  color: alpha(t.palette.text.primary, 0.45),
                  transition: 'color 0.2s, background-color 0.2s',
                  '&:hover': {
                    backgroundColor: alpha(t.palette.text.primary, 0.04),
                    color: alpha(t.palette.text.primary, 0.7),
                  },
                  '&.Mui-selected': {
                    color: t.palette.text.primary,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: t.palette.primary.main,
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
              })}
            >
              {TIMELINE_ORDER.map((tab) => (
                <Tab key={tab} value={tab} label={TIMELINE_LABELS[tab]} />
              ))}
            </Tabs>
          </Box>

          {/* ─── Tab content ─── */}
          {activeTimeline === 'oss' && (
            <Box sx={{ width: '100%' }}>
              <TopMinersTable
                miners={ossMinerStats}
                isLoading={isLoadingMinerStats}
                getMinerHref={getOssMinerHref}
                linkState={OSS_LINK_STATE}
              />
            </Box>
          )}

          {activeTimeline === 'discoveries' && (
            <Box sx={{ width: '100%' }}>
              <TopMinersTable
                miners={sortedDiscMinerStats}
                isLoading={isLoadingMinerStats}
                getMinerHref={getDiscMinerHref}
                linkState={DISC_LINK_STATE}
                variant="discoveries"
              />
            </Box>
          )}
        </Box>

        {/* Right Sidebar — adapts to active timeline */}
        <Box
          ref={showSidebarRight ? stickySidebarRef : undefined}
          sx={{
            width: showSidebarRight ? sidebarWidth : '100%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            position: showSidebarRight ? 'sticky' : 'static',
            top: showSidebarRight ? 88 : 'auto',
          }}
        >
          {activeTimeline === 'discoveries' ? (
            <LeaderboardSidebar
              miners={discMinerStats}
              getMinerHref={getDiscMinerHref}
              linkState={DISC_LINK_STATE}
              variant="discoveries"
              insertAfterFirstCard={optionsPortalTarget}
            />
          ) : (
            <LeaderboardSidebar
              miners={ossMinerStats}
              getMinerHref={getOssMinerHref}
              linkState={OSS_LINK_STATE}
              insertAfterFirstCard={optionsPortalTarget}
            />
          )}
        </Box>
      </Box>
    </Page>
  );
};

export default TopMinersPage;
