import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';
import { Page } from '../components/layout';
import {
  BackButton,
  MinerActivity,
  MinerInsightsCard,
  MinerPRsTable,
  MinerRepositoriesTable,
  MinerScoreBreakdown,
  MinerScoreCard,
  MinerTierPerformance,
  SEO,
} from '../components';

const TAB_NAMES = [
  'overview',
  'activity',
  'pull-requests',
  'repositories',
] as const;
type MinerDetailsTab = (typeof TAB_NAMES)[number];

const MinerDetailsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const githubId = searchParams.get('githubId');

  const tabParam = searchParams.get('tab');
  const activeTab: MinerDetailsTab =
    tabParam && TAB_NAMES.includes(tabParam as MinerDetailsTab)
      ? (tabParam as MinerDetailsTab)
      : 'overview';

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: MinerDetailsTab,
  ) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', newValue);
    setSearchParams(newParams);
  };

  if (!githubId) {
    return <Navigate to="/top-miners" replace />;
  }

  return (
    <Page title="Miner Dashboard">
      <SEO
        title={`Miner Dashboard - ${githubId}`}
        description={`Track earnings, tier progression, contribution quality, and pull request performance for miner ${githubId}.`}
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
          <BackButton to="/top-miners" />

          <MinerScoreCard githubId={githubId} />

          <Box
            sx={{
              borderBottom: '1px solid',
              borderColor: 'border.light',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                '& .MuiTab-root': {
                  color: (t) => t.palette.text.secondary,
                  fontFamily: '"JetBrains Mono", monospace',
                  textTransform: 'none',
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <Tab value="overview" label="Overview" />
              <Tab value="activity" label="Activity" />
              <Tab value="pull-requests" label="Pull Requests" />
              <Tab value="repositories" label="Repositories" />
            </Tabs>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {activeTab === 'overview' && (
              <>
                <MinerTierPerformance githubId={githubId} />
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
