import React from 'react';
import { Box, Stack, Typography, alpha } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import LivePayoutMarquee from './home/LivePayoutMarquee';
import MinerEmissionShare from './home/MinerEmissionShare';
import StarterBounties from './home/StarterBounties';
import StartMiningCta from './home/StartMiningCta';

const HomePage: React.FC = () => {
  return (
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
          pt: { xs: 6, sm: 8 },
          pb: { xs: 4, sm: 6 },
          overflow: 'hidden',
        }}
      >
        <Stack alignItems="center" gap={{ xs: 2, sm: 3 }}>
          <Box
            component="img"
            src="/gt-logo.svg"
            alt="Gittensor"
            sx={(theme) => ({
              height: window.innerWidth < 600 ? '96px' : '128px',
              width: 'auto',
              filter: `grayscale(100%) invert(1) drop-shadow(0 0 12px ${alpha(
                theme.palette.text.primary,
                0.8,
              )})`,
            })}
          />
          <Typography
            variant="h1"
            color="text.primary"
            fontWeight="bold"
            sx={{
              fontSize: { xs: '2rem', sm: '3rem', md: '4rem' },
              textAlign: 'center',
            }}
          >
            GITTENSOR
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            fontWeight="bold"
            sx={{
              fontSize: { xs: '0.9rem', sm: '1rem' },
              textAlign: 'center',
              maxWidth: 480,
            }}
          >
            The workforce for open source. Compete for rewards by contributing
            quality code.
          </Typography>
        </Stack>

        <LivePayoutMarquee />

        <MinerEmissionShare />

        <StarterBounties />

        <StartMiningCta />
      </Box>
    </Page>
  );
};

export default HomePage;
