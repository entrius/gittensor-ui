import React from 'react';
import { Box, Tabs, Tab, Card, CardContent } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { useSearchParams } from 'react-router-dom';
import { AboutContent } from './AboutPage';

import { GettingStarted } from '../components/onboard/GettingStarted';
import { Scoring } from '../components/onboard/Scoring';
import {
  RepositoryWeightsTable,
  LanguageWeightsTable,
} from '../components/repositories';

const OnboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active tab from URL query param or default to 0
  const tabParam = searchParams.get('tab');
  const tabNameToIndex: Record<string, number> = {
    about: 0,
    'getting-started': 1,
    scoring: 2,
    repositories: 3,
    languages: 4,
  };

  const indexToTabName: Record<number, string> = {
    0: 'about',
    1: 'getting-started',
    2: 'scoring',
    3: 'repositories',
    4: 'languages',
  };

  const activeTab =
    tabParam && tabNameToIndex[tabParam] !== undefined
      ? tabNameToIndex[tabParam]
      : 0;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', indexToTabName[newValue]);
    setSearchParams(newParams, { replace: true });
  };

  return (
    <Page title="Onboard">
      <SEO
        title="Getting Started - Gittensor"
        description="Start mining on Gittensor. Setup guide, documentation, and resources."
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: { xs: 'auto', md: 'calc(100vh - 80px)' },
          width: '100%',
          py: 4,
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            width: '100%',
            mb: 4,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              px: 2,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.6)',
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              },
            }}
          >
            <Tab label="About" />
            <Tab label="Getting Started" />
            <Tab label="Scoring" />
            <Tab label="Repositories" />
            <Tab label="Languages" />
          </Tabs>
        </Box>

        <Box sx={{ width: '100%' }}>
          {activeTab === 0 && <AboutContent />}
          {activeTab === 1 && <GettingStarted />}
          {activeTab === 2 && <Scoring />}
          {activeTab === 3 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Card
                sx={{
                  borderRadius: 3,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'transparent',
                  maxWidth: 1200,
                  width: '100%',
                }}
                elevation={0}
              >
                <CardContent>
                  <RepositoryWeightsTable />
                </CardContent>
              </Card>
            </Box>
          )}
          {activeTab === 4 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Card
                sx={{
                  borderRadius: 3,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'transparent',
                  maxWidth: 1200,
                  width: '100%',
                }}
                elevation={0}
              >
                <CardContent>
                  <LanguageWeightsTable />
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      </Box>
    </Page>
  );
};

export default OnboardPage;
