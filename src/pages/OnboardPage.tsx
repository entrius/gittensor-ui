import React from 'react';
import { Box, Tabs, Tab, Card, CardContent } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { useSearchParams } from 'react-router-dom';
import { AboutContent } from '../components/onboard/AboutContent';
import { FAQContent } from '../components/onboard/FAQContent';

import { GettingStarted } from '../components/onboard/GettingStarted';
import { Scoring } from '../components/onboard/Scoring';
import { LanguageWeightsTable } from '../components/repositories';

const OnboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active tab from URL query param or default to 0
  const tabParam = searchParams.get('tab');
  const tabNameToIndex: Record<string, number> = {
    about: 0,
    'getting-started': 1,
    scoring: 2,
    languages: 3,
    faq: 4,
  };

  const indexToTabName: Record<number, string> = {
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
          sx={(theme) => ({
            position: 'sticky',
            top: 0,
            zIndex: 2,
            maxWidth: 1200,
            width: '100%',
            px: { xs: 2, sm: 3, md: 0 },
            mx: 'auto',
            mb: 4,
            backgroundColor: theme.palette.background.default,
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
              px: 0,
              '& .MuiTabs-scrollButtons.Mui-disabled': {
                display: 'none',
              },
              '& .MuiTabs-flexContainer': {
                gap: { xs: 3, sm: 4 },
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minWidth: 'auto',
                minHeight: 48,
                paddingLeft: 0,
                paddingRight: 0,
                fontSize: { xs: '0.95rem', sm: '1rem' },
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

        <Box
          sx={{
            width: '100%',
            maxWidth: 1200,
            mx: 'auto',
            px: 2,
            boxSizing: 'border-box',
          }}
        >
          {activeTab === 0 && <AboutContent />}
          {activeTab === 1 && <GettingStarted />}
          {activeTab === 2 && <Scoring />}
          {activeTab === 3 && (
            <Card
              sx={(theme) => ({
                borderRadius: 3,
                border: '1px solid',
                borderColor: theme.palette.border.light,
                backgroundColor: theme.palette.surface.transparent,
                width: '100%',
              })}
              elevation={0}
            >
              <CardContent>
                <LanguageWeightsTable />
              </CardContent>
            </Card>
          )}
          {activeTab === 4 && <FAQContent />}
        </Box>
      </Box>
    </Page>
  );
};

export default OnboardPage;
