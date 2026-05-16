import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLinkBehavior } from '../common/linkBehavior';
import { OnboardingCard } from '..';

export const AboutContent: React.FC = () => {
  const minerGuide = useLinkBehavior<HTMLAnchorElement>(
    '/onboard?tab=getting-started',
  );
  const registerRepo = useLinkBehavior<HTMLAnchorElement>(
    '/repository-registration',
  );
  const minerDocs = useLinkBehavior<HTMLAnchorElement>(
    'https://docs.gittensor.io/miner.html',
  );
  const maintainerDocs = useLinkBehavior<HTMLAnchorElement>(
    'https://docs.gittensor.io/register-repository.html',
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Typography
        variant="h4"
        sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}
      >
        Get started with Gittensor
      </Typography>
      <Typography
        sx={{ color: 'text.secondary', mb: 5, maxWidth: 680, lineHeight: 1.65 }}
      >
        Pick your path. Miners earn alpha tokens by contributing code.
        Maintainers get free, incentivized contributions to their open source
        projects.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <OnboardingCard
          accent={(theme) => theme.palette.status.info}
          content={{
            kicker: 'Ready to contribute?',
            headline: 'Become a miner',
            body: 'Read the quickstart guide to get set up. No complex infrastructure or always-on servers required.',
            primaryLabel: 'Miner guide',
            primaryLink: minerGuide,
            secondaryLabel: 'Read docs',
            secondaryLink: minerDocs,
          }}
        />
        <OnboardingCard
          accent={(theme) => theme.palette.status.merged}
          content={{
            kicker: 'Maintain a repo?',
            headline: 'Become a maintainer',
            body: 'Install the GitHub App and submit a quick form. The team reviews each repo before listing.',
            primaryLabel: 'Register a repo',
            primaryLink: registerRepo,
            secondaryLabel: 'Read docs',
            secondaryLink: maintainerDocs,
          }}
        />
      </Box>
    </Box>
  );
};
