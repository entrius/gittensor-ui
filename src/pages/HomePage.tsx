import React from 'react';
import { Box, Stack, Typography, alpha } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { useMonthlyRewards } from '../hooks/useMonthlyRewards';

const HomePage: React.FC = () => {
  const monthlyRewards = useMonthlyRewards();

  return (
    <Page title="Home">
      <SEO
        title="Autonomous Software Development"
        description="The workforce for open source. Compete for rewards by contributing quality code to open source repositories."
        type="website"
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: 'calc(100vh - 64px)', md: '100vh' },
          width: '100%',
          px: { xs: 2, sm: 3 },
        }}
      >
        <Stack
          alignItems="center"
          justifyContent="center"
          gap={{ xs: 2, sm: 3 }}
        >
          <Box
            component="img"
            src="/gt-logo.svg"
            alt="Gittensor"
            sx={(theme) => ({
              height: window.innerWidth < 600 ? '96px' : '128px',
              width: 'auto',
              // Dark: invert SVG to white with a subtle glow.
              // Light: show the original dark artwork as-is (no inversion).
              filter:
                theme.palette.mode === 'dark'
                  ? `brightness(0) invert(1) drop-shadow(0 0 12px ${alpha(
                      theme.palette.text.primary,
                      0.8,
                    )})`
                  : 'brightness(0)',
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
            }}
          >
            The workforce for open source.
          </Typography>

          {/* Monthly Rewards Banner */}
          {monthlyRewards && (
            <Box
              sx={(theme) => ({
                mt: { xs: 4, sm: 5 },
                px: { xs: 3, sm: 5, md: 7 },
                py: { xs: 2.5, sm: 3.5 },
                borderRadius: 2,
                background: alpha(theme.palette.background.default, 0.4),
                border: '1px solid',
                borderColor: theme.palette.border.light,
                backdropFilter:
                  theme.palette.mode === 'dark' ? 'blur(10px)' : 'none',
                boxShadow: `0 8px 32px ${alpha(theme.palette.background.default, 0.3)}`,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  borderColor: theme.palette.border.medium,
                  boxShadow: `0 12px 48px ${alpha(theme.palette.background.default, 0.4)}`,
                  transform: 'translateY(-2px)',
                },
              })}
            >
              <Stack alignItems="center" gap={{ xs: 1, sm: 1.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: (theme) => theme.palette.text.secondary,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    fontWeight: 500,
                  }}
                >
                  Monthly Reward Pool
                </Typography>
                <Typography
                  variant="h2"
                  fontWeight="600"
                  sx={{
                    color: (theme) => theme.palette.text.primary,
                    fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem' },
                    letterSpacing: '-0.02em',
                  }}
                >
                  $
                  {monthlyRewards.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: (theme) => theme.palette.text.tertiary,
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    textAlign: 'center',
                    maxWidth: '400px',
                    lineHeight: 1.6,
                  }}
                >
                  Compete for rewards by contributing quality code to open
                  source
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
    </Page>
  );
};

export default HomePage;
