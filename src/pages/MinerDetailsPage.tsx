import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Page } from '../components/layout';
import {
  MinerScoreCard,
  MinerActivity,
  MinerRepositoriesTable,
  MinerPRsTable,
  MinerTierPerformance,
  BackButton,
  SEO,
} from '../components';
import MinerEarningsDashboard from '../components/miners/MinerEarningsDashboard';
import MinerInsightsCard from '../components/miners/MinerInsightsCard';

const MinerDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const githubId = searchParams.get('githubId');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'prs' | 'repos'>('dashboard');

  // If no githubId is provided, redirect to miners page
  if (!githubId) {
    navigate('//top-miners');
    return null;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: typeof activeTab) => {
    setActiveTab(newValue);
  };

  return (
    <Page title="Miner Dashboard">
      <SEO
        title={`Dashboard - ${githubId}`}
        description={`Personal performance dashboard for ${githubId}. Track earnings, tier progress, and contributions on Gittensor.`}
        type="website"
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          py: { xs: 2, sm: 3 },
          px: { xs: 0, sm: 2 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxWidth: 1200,
            width: '100%',
            px: { xs: 2, sm: 0 },
          }}
        >
          <BackButton to="/top-miners" />

          {/* Personal Identity & Quick Stats */}
          <MinerScoreCard githubId={githubId} />

          {/* Navigation Tabs */}
          <Box
            sx={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 2,
              px: 2,
              overflow: 'hidden',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': {
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85rem',
                  textTransform: 'none',
                  minHeight: 56,
                  '&:hover': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'primary.main',
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
              }}
            >
              <Tab
                label={
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Dashboard
                  </Typography>
                }
                value="dashboard"
              />
              <Tab label="Activity Timeline" value="activity" />
              <Tab label="Pull Requests" value="prs" />
              <Tab label="Repositories" value="repos" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            {activeTab === 'dashboard' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Earnings Dashboard - Most Important for Miners */}
                <MinerEarningsDashboard githubId={githubId} />

                {/* Tier Progress - Clear Path Forward */}
                <MinerTierPerformance githubId={githubId} />

                {/* Insights & Recommendations - What to do next */}
                <MinerInsightsCard githubId={githubId} />
              </Box>
            )}

            {activeTab === 'activity' && (
              <MinerActivity githubId={githubId} />
            )}

            {activeTab === 'prs' && (
              <MinerPRsTable githubId={githubId} />
            )}

            {activeTab === 'repos' && (
              <MinerRepositoriesTable githubId={githubId} />
            )}
          </Box>
        </Box>
      </Box>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </Page>
  );
};

export default MinerDetailsPage;
