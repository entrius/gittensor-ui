import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Box, Tab, Tabs, Typography, alpha } from '@mui/material';
import { Page } from '../components/layout';
import {
  BackButton,
  MinerActivity,
  MinerInsightsCard,
  MinerPRsTable,
  MinerRepositoriesTable,
  MinerScoreBreakdown,
  MinerScoreCard,
  SEO,
} from '../components';

type ViewMode = 'prs' | 'issues';

const TAB_NAMES = [
  'overview',
  'activity',
  'pull-requests',
  'repositories',
] as const;
type MinerDetailsTab = (typeof TAB_NAMES)[number];

const tabSx = {
  '& .MuiTab-root': {
    color: 'text.secondary',
    fontFamily: '"JetBrains Mono", monospace',
    textTransform: 'none' as const,
    fontSize: '0.83rem',
    fontWeight: 500,
    '&.Mui-selected': { color: 'primary.main' },
  },
};

const MinerDetailsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const githubId = searchParams.get('githubId');

  const modeParam = searchParams.get('mode');
  const viewMode: ViewMode = modeParam === 'issues' ? 'issues' : 'prs';

  const tabParam = searchParams.get('tab');
  const activeTab: MinerDetailsTab =
    tabParam && TAB_NAMES.includes(tabParam as MinerDetailsTab)
      ? (tabParam as MinerDetailsTab)
      : 'overview';

  const handleModeChange = (mode: ViewMode) => {
    const p = new URLSearchParams(searchParams);
    p.set('mode', mode);
    p.set('tab', 'overview');
    setSearchParams(p);
  };

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: MinerDetailsTab,
  ) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', newValue);
    setSearchParams(p);
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
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <BackButton to="/top-miners" mb={0} />
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
              ).map((option) => (
                <Box
                  key={option.value}
                  onClick={() => handleModeChange(option.value)}
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    backgroundColor:
                      viewMode === option.value
                        ? 'surface.elevated'
                        : 'transparent',
                    color:
                      viewMode === option.value
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
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    {option.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <MinerScoreCard githubId={githubId} viewMode={viewMode} />

          <Box sx={{ borderBottom: '1px solid', borderColor: 'border.light' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={tabSx}
            >
              <Tab value="overview" label="Overview" />
              <Tab value="activity" label="Activity" />
              <Tab
                value="pull-requests"
                label={viewMode === 'issues' ? 'Issues' : 'Pull Requests'}
              />
              <Tab value="repositories" label="Repositories" />
            </Tabs>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {activeTab === 'overview' && (
              <>
                <MinerInsightsCard githubId={githubId} />
                <MinerScoreBreakdown githubId={githubId} />
              </>
            )}
            {activeTab === 'activity' && <MinerActivity githubId={githubId} />}
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
