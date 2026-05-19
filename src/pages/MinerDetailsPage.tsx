import React from 'react';
import { Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { Box, Tab, Tabs, Typography, alpha } from '@mui/material';
import { Page } from '../components/layout';
import { LinkBox } from '../components/common/linkBehavior';
import {
  BackButton,
  MinerActivity,
  MinerIdentityRail,
  MinerOpenDiscoveryIssuesByRepo,
  MinerPRsTable,
  MinerRepoStandings,
  SEO,
} from '../components';
import { WatchlistButton } from '../components/common';
import { useMinerStats } from '../api';

type ViewMode = 'prs' | 'issues';

const PR_TABS = ['pull-requests', 'activity'] as const;
const ISSUE_TABS = ['open-issues', 'activity'] as const;
type MinerDetailsTab = (typeof PR_TABS)[number] | (typeof ISSUE_TABS)[number];

const tabsAlignSx = {
  '& .MuiTab-root': {
    color: 'text.secondary',
    textTransform: 'none' as const,
    fontSize: '0.83rem',
    fontWeight: 500,
    '&.Mui-selected': { color: 'primary.main' },
    '&:first-of-type': { pl: 0 },
  },
};

const MinerDetailsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const githubId = searchParams.get('githubId');

  const modeParam = searchParams.get('mode');
  const viewMode: ViewMode = modeParam === 'issues' ? 'issues' : 'prs';

  const tabs = viewMode === 'issues' ? ISSUE_TABS : PR_TABS;
  const defaultTab: MinerDetailsTab = tabs[0];

  const buildModeHref = (mode: ViewMode) => {
    const p = new URLSearchParams(searchParams);
    p.set('mode', mode);
    // Drop the tab param so the new mode lands on its own first tab —
    // PR and issue modes have disjoint first tabs.
    p.delete('tab');
    return `${location.pathname}?${p.toString()}`;
  };

  const tabParam = searchParams.get('tab');
  const activeTab: MinerDetailsTab =
    tabParam && (tabs as readonly string[]).includes(tabParam)
      ? (tabParam as MinerDetailsTab)
      : defaultTab;

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: MinerDetailsTab,
  ) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', newValue);
    setSearchParams(p, { replace: true });
  };

  const { data: minerStats, isLoading: isLoadingMinerStats } = useMinerStats(
    githubId ?? '',
  );
  // Only show the star once we've confirmed the miner exists — otherwise
  // users can pin phantom entries via /miners/details?githubId=<anything>.
  const minerExists = !isLoadingMinerStats && !!minerStats;

  if (!githubId) {
    return <Navigate to="/repositories" replace />;
  }

  return (
    <Page title="Miner Dashboard">
      <SEO
        title={`Miner Dashboard - ${githubId}`}
        description={`Track earnings, contribution quality, and performance for miner ${githubId}.`}
        type="website"
      />
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'center',
          py: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            width: '100%',
            maxWidth: 1320,
            px: { xs: 2, md: 0 },
          }}
        >
          {/* ── Header: back · mode toggle · watch ─────────────── */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <BackButton to="/repositories" />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
              }}
            >
              {/* Mode toggle — a real page-level axis, not a stat */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  backgroundColor: 'surface.subtle',
                  p: 0.5,
                  borderRadius: 2,
                }}
              >
                {(
                  [
                    { label: 'OSS Contributions', value: 'prs' as const },
                    { label: 'Issue Discovery', value: 'issues' as const },
                  ] as const
                ).map((option) => {
                  const isActive = viewMode === option.value;
                  return (
                    <LinkBox
                      key={option.value}
                      href={buildModeHref(option.value)}
                      replace
                      sx={{
                        px: 2,
                        py: 0.75,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        backgroundColor: isActive
                          ? 'surface.elevated'
                          : 'transparent',
                        color: isActive
                          ? 'text.primary'
                          : (t) => alpha(t.palette.text.primary, 0.5),
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: 'surface.elevated',
                          color: 'text.primary',
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {option.label}
                      </Typography>
                    </LinkBox>
                  );
                })}
              </Box>
              {minerExists && (
                <WatchlistButton
                  category="miners"
                  itemKey={githubId}
                  size="medium"
                />
              )}
            </Box>
          </Box>

          {/* ── Two-column shell: main + sticky identity rail ──── */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            {/* Identity rail — right sidebar on desktop (sticky); ordered
                first on mobile so identity is not buried below the page. */}
            <Box
              sx={{
                order: { md: 2 },
                position: { md: 'sticky' },
                top: { md: 24 },
                minWidth: 0,
              }}
            >
              <MinerIdentityRail githubId={githubId} viewMode={viewMode} />
            </Box>

            {/* Main column */}
            <Box
              sx={{
                order: { md: 1 },
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                minWidth: 0,
              }}
            >
              {/* Centerpiece — per-repository standings */}
              <MinerRepoStandings githubId={githubId} viewMode={viewMode} />

              {/* Reduced detail tabs */}
              <Box
                sx={{ borderBottom: '1px solid', borderColor: 'border.light' }}
              >
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons={false}
                  sx={tabsAlignSx}
                >
                  {viewMode === 'issues' ? (
                    <Tab value="open-issues" label="Open Issues" />
                  ) : (
                    <Tab value="pull-requests" label="Pull Requests" />
                  )}
                  <Tab value="activity" label="Activity" />
                </Tabs>
              </Box>

              <Box>
                {activeTab === 'pull-requests' && viewMode === 'prs' && (
                  <MinerPRsTable githubId={githubId} />
                )}
                {activeTab === 'open-issues' && viewMode === 'issues' && (
                  <MinerOpenDiscoveryIssuesByRepo githubId={githubId} />
                )}
                {activeTab === 'activity' && (
                  <MinerActivity githubId={githubId} viewMode={viewMode} />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default MinerDetailsPage;
