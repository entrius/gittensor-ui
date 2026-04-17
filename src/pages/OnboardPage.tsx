import React from 'react';
import { Box, Tabs, Tab, Card, CardContent } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { useSearchParams, useLocation } from 'react-router-dom';
import { AboutContent } from '../components/onboard/AboutContent';
import { FAQContent } from '../components/onboard/FAQContent';

import { GettingStarted } from '../components/onboard/GettingStarted';
import { Scoring } from '../components/onboard/Scoring';
import { LanguageWeightsTable } from '../components/repositories';

const ONBOARD_TAB_SEO: Record<
  'about' | 'getting-started' | 'scoring' | 'languages' | 'faq',
  { title: string; description: string }
> = {
  about: {
    title: 'About',
    description:
      'What Gittensor is, how incentives work, and how open-source miners earn rewards.',
  },
  'getting-started': {
    title: 'Getting Started',
    description:
      'Start mining on Gittensor. Setup guide, documentation, and resources.',
  },
  scoring: {
    title: 'Scoring',
    description:
      'How miner scores work: OSS contributions, PR merges, code quality, discovery bonuses, and credibility requirements.',
  },
  languages: {
    title: 'Languages',
    description:
      'Programming language weights used when scoring contributions across tracked repositories.',
  },
  faq: {
    title: 'FAQ',
    description:
      'Answers to common questions about subnets, incentives, staking, and Gittensor.',
  },
};

type OnboardTabKey = keyof typeof ONBOARD_TAB_SEO;

const OnboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Determine active tab from URL query param or default to 0
  const tabParam = searchParams.get('tab');
  const tabNameToIndex: Record<string, number> = {
    about: 0,
    'getting-started': 1,
    scoring: 2,
    languages: 3,
    faq: 4,
  };

  const indexToTabName: Record<number, OnboardTabKey> = {
    0: 'about',
    1: 'getting-started',
    2: 'scoring',
    3: 'languages',
    4: 'faq',
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

  const activeTabKey = indexToTabName[activeTab];
  const { title: seoTitle, description: seoDescription } =
    ONBOARD_TAB_SEO[activeTabKey];
  const seoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${location.pathname}${location.search}`
      : undefined;

  return (
    <Page title="Onboard">
      <SEO title={seoTitle} description={seoDescription} url={seoUrl} />
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
          sx={(theme) => ({
            maxWidth: 1200,
            width: '100%',
            mb: 4,
            borderBottom: '1px solid',
            borderColor: theme.palette.border.light,
          })}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={(theme) => ({
              px: 2,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '1rem',
                color: theme.palette.text.secondary,
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                },
              },
            })}
          >
            <Tab label="About" />
            <Tab label="Getting Started" />
            <Tab label="Scoring" />
            <Tab label="Languages" />
            <Tab label="FAQ" />
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
                sx={(theme) => ({
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: theme.palette.border.light,
                  backgroundColor: theme.palette.surface.transparent,
                  maxWidth: 1200,
                  width: '100%',
                })}
                elevation={0}
              >
                <CardContent>
                  <LanguageWeightsTable />
                </CardContent>
              </Card>
            </Box>
          )}
          {activeTab === 4 && <FAQContent />}
        </Box>
      </Box>
    </Page>
  );
};

export default OnboardPage;
