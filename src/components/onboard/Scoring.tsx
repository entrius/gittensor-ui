import React from 'react';
import { Box, Typography, Button, Grid } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { BORDER_SUBTLE } from '../../theme';

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
          desc: 'Target high-weight repositories like Bitcoin, Ethereum, or PyTorch. Contribution scores decay over time — merge frequently and promptly. Requires at least 5 valid merged PRs to qualify.',
        },
        {
          title: 'Issue Multiplier',
          desc: "Link your PR to the issue it resolves (e.g. 'Closes #123') for a 1.33× score boost — or 1.66× if the issue was opened by a project maintainer.",
        },
        {
          title: 'Code Quality',
          desc: 'Write meaningful code. AST-based token scoring rewards structural changes (functions, classes, logic) over simple text, configs, or whitespace edits.',
        },
        {
          title: 'Credibility',
          desc: 'Keep your merge rate high. You need at least 80% credibility (merged / total, with one closed-PR mulligan) and 5 valid merged PRs to become eligible.',
        },
        {
          title: 'Issue Discovery',
          desc: 'Earn from a dedicated 30% emission pool by finding open issues that others later solve with a merged PR. Requires 7+ solved issues and 80% issue credibility to qualify.',
        },
        {
          title: 'Pioneer Bonus',
          desc: "Be the first quality contributor to a repository and earn a pioneer dividend — a percentage of every follower's score, up to doubling your own rewards.",
        },
      ].map((item, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Box
            sx={{
              height: '100%',
              p: 3,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${BORDER_SUBTLE}`,
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
        border: `1px solid ${BORDER_SUBTLE}`,
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
        href="https://docs.gittensor.io/oss-contributions.html"
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
