import React, { useState } from 'react';
import {
  Box,
  Card,
  Collapse,
  Typography,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const BULLETS = [
  {
    title: 'Base score',
    text: 'Earned from merged code: structural and leaf token analysis, weighted by file type.',
  },
  {
    title: 'Repository weight',
    text: 'Tier (Bronze/Silver/Gold) of the repo multiplies the base score. Higher tiers yield more.',
  },
  {
    title: 'Credibility multiplier',
    text: 'Your merge rate (merged vs closed PRs) scales the score. Higher credibility increases payouts.',
  },
  {
    title: 'Time decay',
    text: 'Older merges contribute less over time; recent work is weighted more.',
  },
  {
    title: 'Open PR collateral',
    text: 'Open PRs have a portion of potential score held as collateral until merge or close. Too many open PRs can trigger penalties.',
  },
];

const MinerScoreCalculationCard: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
        }}
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
      >
        <Typography
          sx={{
            color: '#ffffff',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          How your score is calculated
        </Typography>
        <IconButton
          size="small"
          aria-label={open ? 'Collapse' : 'Expand'}
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 0 }}>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.6)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.78rem',
              mb: 1.5,
              lineHeight: 1.5,
            }}
          >
            Your total score combines these factors. Each PR in the table below
            shows its own base score, token score, and credibility so you can
            trace where your earnings come from.
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {BULLETS.map((b, i) => (
              <Box
                component="li"
                key={i}
                sx={{
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.78rem',
                  lineHeight: 1.6,
                  mb: 1,
                }}
              >
                <Box component="span" sx={{ fontWeight: 600, color: '#ffffff' }}>
                  {b.title}.
                </Box>{' '}
                {b.text}
              </Box>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Card>
  );
};

export default MinerScoreCalculationCard;
