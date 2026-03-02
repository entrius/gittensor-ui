import React, { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';
import { Page } from '../components/layout';
import {
  BackButton,
  MinerActivity,
  MinerEarningsDashboard,
  MinerFocusCard,
  MinerInsightsCard,
  MinerPRsTable,
  MinerRepositoriesTable,
  MinerScoreCalculationCard,
  MinerScoreCard,
  MinerTierPerformance,
  SEO,
} from '../components';

type MinerDetailsTab = 'overview' | 'activity' | 'pull-requests' | 'repositories';

const MinerDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const githubId = searchParams.get('githubId');
  const [activeTab, setActiveTab] = useState<MinerDetailsTab>('overview');

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
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              px: { xs: 1, sm: 2 },
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_event, nextTab: MinerDetailsTab) =>
                setActiveTab(nextTab)
              }
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  color: 'rgba(255,255,255,0.58)',
                  fontFamily: '"JetBrains Mono", monospace',
                  textTransform: 'none',
                  fontSize: '0.83rem',
                  minHeight: 56,
                  '&.Mui-selected': {
                    color: '#fff',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'primary.main',
                  height: 2.5,
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
                <MinerEarningsDashboard githubId={githubId} />
                <MinerFocusCard githubId={githubId} />
                <MinerInsightsCard githubId={githubId} />
                <MinerTierPerformance githubId={githubId} />
                <MinerScoreCalculationCard />
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
