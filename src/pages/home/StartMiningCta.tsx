import React from 'react';
import { Box, Button, Stack, Typography, alpha } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const StartMiningCta: React.FC = () => (
  <Box
    sx={(theme) => ({
      width: '100%',
      maxWidth: 960,
      mx: 'auto',
      mt: { xs: 5, sm: 7 },
      mb: { xs: 4, sm: 6 },
      p: { xs: 3, sm: 4 },
      borderRadius: 3,
      border: `1px solid ${theme.palette.border.medium}`,
      background: `linear-gradient(135deg, ${alpha(
        theme.palette.diff.additions,
        0.12,
      )} 0%, ${alpha(theme.palette.status.award, 0.08)} 100%)`,
      backdropFilter: 'blur(12px)',
    })}
  >
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      spacing={{ xs: 2, sm: 3 }}
    >
      <Box>
        <Typography
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            fontWeight: 700,
            color: 'text.primary',
            lineHeight: 1.2,
            mb: 0.5,
          }}
        >
          Start mining in 60 seconds
        </Typography>
        <Typography
          sx={{
            fontSize: '0.85rem',
            color: 'text.secondary',
            lineHeight: 1.5,
          }}
        >
          Pick a bounty, write a PR, get paid in TAO. No registration required.
        </Typography>
      </Box>
      <Stack direction="row" spacing={1.5} flexShrink={0}>
        <Button
          component={RouterLink}
          to="/bounties"
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            borderRadius: 2,
          }}
        >
          Browse bounties
        </Button>
        <Button
          component={RouterLink}
          to="/onboard"
          variant="outlined"
          size="large"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            borderRadius: 2,
          }}
        >
          How it works
        </Button>
      </Stack>
    </Stack>
  </Box>
);

export default StartMiningCta;
