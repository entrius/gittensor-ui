import React from 'react';
import { Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { Box, Tab, Tabs, Typography, alpha } from '@mui/material';
import { Page } from '../components/layout';
import { LinkBox } from '../components/common/linkBehavior';
import {
  BackButton,
  MinerActivity,
  MinerInsightsCard,
  MinerOpenDiscoveryIssuesByRepo,
  MinerPRsTable,
  MinerRepositoriesTable,
  MinerScoreBreakdown,
  MinerScoreCard,
  SEO,
} from '../components';
import { WatchlistButton } from '../components/common';

type ViewMode = 'prs' | 'issues';

const PR_TABS = [
  'overview',
  'activity',
  'pull-requests',
  'repositories',
] as const;
const ISSUE_TABS = [
  'overview',
  'activity',
  'open-issues',
  'repositories',
] as const;
type MinerDetailsTab = (typeof PR_TABS)[number] | (typeof ISSUE_TABS)[number];

/**
 * Align first tab label with Card body content (MinerInsightsCard `p: 3` — same edge as
 * "Insights & Next Actions" and insight row borders, not inner `px: 1.5` text).
 * Padding lives on the tab flex row, not the scroll buttons: with scroll arrows, the
 * first tab was shifted right by the left arrow width.
 */
const tabsAlignSx = {
  '& .MuiTabs-flexContainer': {
    pl: 3,
  },
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

  const buildModeHref = (mode: ViewMode) => {
    const p = new URLSearchParams(searchParams);
    p.set('mode', mode);
    p.set('tab', 'overview');
    return `${location.pathname}?${p.toString()}`;
  };

  const modeParam = searchParams.get('mode');
  const viewMode: ViewMode = modeParam === 'issues' ? 'issues' : 'prs';

  const tabs = viewMode === 'issues' ? ISSUE_TABS : PR_TABS;

  const tabParam = searchParams.get('tab');
  const activeTab: MinerDetailsTab =
    tabParam && (tabs as readonly string[]).includes(tabParam)
      ? (tabParam as MinerDetailsTab)
      : 'overview';

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: MinerDetailsTab,
  ) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', newValue);
    setSearchParams(p, { replace: true });
  };

  if (!githubId) {
    return <Navigate to="/top-miners" replace />;
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
            maxWidth: 1240,
            px: { xs: 2, md: 0 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.25, sm: 0 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <BackButton to="/top-miners" mb={0} />
              <WatchlistButton
                category="miners"
                itemKey={githubId}
                size="medium"
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                width: { xs: '100%', sm: 'auto' },
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
                    sx={{
                      px: { xs: 1.25, sm: 2 },
                      py: 0.75,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      minWidth: 0,
                      flex: { xs: 1, sm: '0 0 auto' },
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
                        fontSize: { xs: '0.74rem', sm: '0.8rem' },
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
          </Box>

          <MinerScoreCard githubId={githubId} viewMode={viewMode} />

          <Box sx={{ borderBottom: '1px solid', borderColor: 'border.light' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons={false}
              sx={tabsAlignSx}
            >
              <Tab value="overview" label="Overview" />
              <Tab value="activity" label="Activity" />
              {viewMode === 'issues' && (
                <Tab value="open-issues" label="Open issues" />
              )}
              {viewMode === 'prs' && (
                <Tab value="pull-requests" label="Pull Requests" />
              )}
              <Tab value="repositories" label="Repositories" />
            </Tabs>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {activeTab === 'overview' && (
              <>
                <MinerInsightsCard githubId={githubId} viewMode={viewMode} />
                <MinerScoreBreakdown githubId={githubId} viewMode={viewMode} />
              </>
            )}

            {activeTab === 'activity' && (
              <MinerActivity githubId={githubId} viewMode={viewMode} />
            )}
            {activeTab === 'open-issues' && viewMode === 'issues' && (
              <MinerOpenDiscoveryIssuesByRepo githubId={githubId} />
            )}
            {activeTab === 'pull-requests' && (
              <MinerPRsTable githubId={githubId} />
            )}
            {activeTab === 'repositories' && (
              <MinerRepositoriesTable githubId={githubId} />
            )}
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default MinerDetailsPage;
