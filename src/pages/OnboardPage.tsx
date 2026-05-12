import React from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { useSearchParams } from 'react-router-dom';
import { AboutContent } from '../components/onboard/AboutContent';
import { FAQContent } from '../components/onboard/FAQContent';
import { GettingStarted } from '../components/onboard/GettingStarted';
import { LanguageWeightsTable } from '../components/repositories';

const TABS = [
  { key: 'about', label: 'Overview' },
  { key: 'getting-started', label: 'Setup' },
  { key: 'languages', label: 'Languages' },
  { key: 'faq', label: 'FAQ' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const OnboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey =
    tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : 'about';

  const handleTabChange = (_: React.SyntheticEvent, key: TabKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    setSearchParams(next, { replace: true });
  };

  return (
    <Page title="Onboard">
      <SEO
        title="Getting Started - Gittensor"
        description="Start mining on Gittensor. Setup guide, documentation, and resources."
      />

      <Box sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={(theme) => ({
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: theme.palette.background.default,
            '& .MuiTab-root.Mui-selected': {
              color: theme.palette.common.white,
            },
          })}
        >
          {TABS.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={tab.label} />
          ))}
        </Tabs>

        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            py: { xs: 4, md: 6 },
            boxSizing: 'border-box',
          }}
        >
          {activeTab === 'about' && <AboutContent />}
          {activeTab === 'getting-started' && <GettingStarted />}
          {activeTab === 'languages' && <LanguageWeightsTable />}
          {activeTab === 'faq' && <FAQContent />}
        </Box>
      </Box>
    </Page>
  );
};

export default OnboardPage;
