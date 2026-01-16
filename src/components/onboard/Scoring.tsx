import React from 'react';
import { Box, Typography, Button, Grid } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export const Scoring: React.FC = () => (
  <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
    <Typography
      variant="h4"
      fontWeight="bold"
      sx={{
        mb: 6,
        fontFamily: '"JetBrains Mono", monospace',
        color: '#fff',
        textAlign: 'center',
      }}
    >
      Maximize Your Rewards
    </Typography>

    <Grid container spacing={3} sx={{ mb: 8 }}>
      {[
        {
          title: 'Merge PRs',
          desc: "Focus on merging code changes to high weighted repositories. Your score's main factor is determined by the weight of the repository.",
        },
        {
          title: 'Solve Issues',
          desc: "Link your PR to the issue it resolves (e.g. 'Closes #123'). Resolving older issues applies a higher bonus multiplier.",
        },
        {
          title: 'Code Quality',
          desc: 'Write meaningful code contributions. Token-based scoring rewards structural code changes over simple text or config edits.',
        },
        {
          title: 'Credibility',
          desc: 'Keep your merge rate high. A strong ratio of merged vs. closed PRs increases your credibility and unlocks tier multipliers.',
        },
      ].map((item, index) => (
        <Grid item xs={12} md={3} key={index}>
          <Box
            sx={{
              height: '100%',
              p: 3,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'transform 0.2s, border-color 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                background: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'secondary.main',
              },
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: '#fff',
                mb: 2,
                fontSize: '1.1rem',
              }}
            >
              {item.title}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.6,
              }}
            >
              {item.desc}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>

    <Box
      sx={{
        textAlign: 'center',
        p: 6,
        borderRadius: 4,
        background:
          'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: '#fff' }}>
        Dive Deeper
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
      >
        Learn about the exact formulas, multipliers, and weight calculations in
        our detailed documentation.
      </Typography>
      <Button
        variant="contained"
        color="secondary"
        size="large"
        href="https://docs.gittensor.io/scoring.html"
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<OpenInNewIcon />}
        sx={{
          px: 5,
          py: 1.5,
          fontSize: '1rem',
          fontWeight: 'bold',
          borderRadius: '50px',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.2)',
          textTransform: 'none',
        }}
      >
        View Scoring Documentation
      </Button>
    </Box>
  </Box>
);
