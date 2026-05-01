import React from 'react';
import { Box, Grid, Stack, Typography, alpha } from '@mui/material';

const STEPS = [
  {
    n: '01',
    title: 'Code is the work',
    body: 'You earn for merged pull requests to recognized open-source repos. Not for posts, votes, or hype — just shipped code.',
    tone: 'primary' as const,
  },
  {
    n: '02',
    title: 'AI is the judge',
    body: 'Subnet 74 validators score each PR with on-chain AI: token-level structure, density, language weight, repo weight, credibility.',
    tone: 'primary' as const,
  },
  {
    n: '03',
    title: 'TAO is the reward',
    body: 'Scores translate to alpha tokens emitted by Bittensor every block. Higher score, higher emission share — paid continuously.',
    tone: 'award' as const,
  },
];

const HowItWorks: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      maxWidth: 1100,
      mx: 'auto',
      mt: { xs: 5, sm: 7 },
    }}
  >
    <Typography
      sx={{
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        fontWeight: 600,
        color: 'text.secondary',
        textAlign: 'center',
        mb: 2,
      }}
    >
      How it works
    </Typography>
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {STEPS.map((step) => (
        <Grid item xs={12} md={4} key={step.n}>
          <Stack
            spacing={1.25}
            sx={(theme) => ({
              height: '100%',
              p: { xs: 2.5, sm: 3 },
              borderRadius: 2,
              border: `1px solid ${theme.palette.border.light}`,
              backgroundColor: alpha(theme.palette.background.default, 0.4),
            })}
          >
            <Typography
              sx={(theme) => ({
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color:
                  step.tone === 'award'
                    ? theme.palette.status.award
                    : theme.palette.diff.additions,
              })}
            >
              {step.n}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.2rem' },
                fontWeight: 700,
                color: 'text.primary',
                lineHeight: 1.25,
              }}
            >
              {step.title}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.85rem',
                color: 'text.secondary',
                lineHeight: 1.6,
              }}
            >
              {step.body}
            </Typography>
          </Stack>
        </Grid>
      ))}
    </Grid>
  </Box>
);

export default HowItWorks;
