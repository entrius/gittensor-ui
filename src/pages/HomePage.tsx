import React from 'react';
import { Box } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import HeroFlow from './home/HeroFlow';
import HowItWorks from './home/HowItWorks';
import TopContributors from './home/TopContributors';
import StarterBounties from './home/StarterBounties';

const HomePage: React.FC = () => (
  <Page title="Home">
    <SEO
      title="Autonomous Software Development"
      description="The workforce for open source. Compete for rewards by contributing quality code to open source repositories."
      type="website"
    />
    <Box
      sx={{
        width: '100%',
        px: { xs: 2, sm: 3 },
        pb: { xs: 6, sm: 8 },
        overflow: 'hidden',
      }}
    >
      <HeroFlow />
      <HowItWorks />
      <TopContributors />
      <StarterBounties />
    </Box>
  </Page>
);

export default HomePage;
