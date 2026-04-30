import React from 'react';
import { Box, Button, Chip, Stack, Typography, alpha } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { Link as RouterLink } from 'react-router-dom';
import { Page } from '../../components/layout';
import { SEO } from '../../components';
import { useMonthlyRewards } from '../../hooks/useMonthlyRewards';
import HeroPortal from './HeroPortal';
import MonthlyRewardSummary from './MonthlyRewardSummary';
import { PRIMARY_RGB, WHITE_RGB } from './heroConstants';

const CTA_GRADIENT_COLORS = {
  shadeDark: '#0d1fc9',
  shadeLight: '#3d5cff',
} as const;

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
        sx={(theme) => ({
          position: 'relative',
          width: '100%',
          minHeight: { xs: 'auto', md: 'calc(100vh - 32px)' },
          overflow: 'hidden',
          px: { xs: 2, sm: 3 },
          pt: { xs: 4, sm: 5, lg: 6 },
          pb: { xs: 5, md: 6 },
          background: [
            `radial-gradient(ellipse 90% 55% at 50% 42%, ${alpha(
              theme.palette.primary.main,
              0.16,
            )} 0%, transparent 56%)`,
            theme.palette.background.default,
          ].join(', '),
          '@keyframes homeFadeIn': {
            from: { opacity: 0, transform: 'translateY(8px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          '@keyframes haloBreathe': {
            '0%, 100%': { opacity: 0.92, transform: 'scale(1)' },
            '50%': { opacity: 1, transform: 'scale(1.025)' },
          },
          '@keyframes diskPulse': {
            '0%, 100%': { opacity: 0.92 },
            '50%': { opacity: 1 },
          },
          '@keyframes rippleShimmer': {
            '0%, 100%': { opacity: 0.4 },
            '50%': { opacity: 0.78 },
          },
          '@keyframes sparkTwinkle': {
            '0%, 100%': { opacity: 0.2 },
            '50%': { opacity: 1 },
          },
          '@keyframes glowWave': {
            '0%': { opacity: 0, transform: 'scale(0.55)' },
            '15%': { opacity: 0.95 },
            '100%': { opacity: 0, transform: 'scale(1.95)' },
          },
          '@keyframes archGlow': {
            '0%, 100%': {
              opacity: 0.92,
              filter: `drop-shadow(0 0 18px rgba(${PRIMARY_RGB}, 0.85)) drop-shadow(0 0 36px rgba(${WHITE_RGB}, 0.35))`,
            },
            '50%': {
              opacity: 1,
              filter: `drop-shadow(0 0 28px rgba(${PRIMARY_RGB}, 1)) drop-shadow(0 0 56px rgba(${WHITE_RGB}, 0.55))`,
            },
          },
          '@keyframes archTravel': {
            from: { strokeDashoffset: 0 },
            to: { strokeDashoffset: -1200 },
          },
        })}
      >
        <Stack
          alignItems="center"
          gap={{ xs: 2.25, sm: 2.75 }}
          sx={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            animation: 'homeFadeIn 420ms ease-out both',
          }}
        >
          <Chip
            icon={<AutoStoriesIcon />}
            label="Autonomous software development"
            variant="info"
            sx={(theme) => ({
              height: 28,
              color: theme.palette.text.primary,
              backgroundColor: alpha(theme.palette.common.white, 0.035),
              borderColor: theme.palette.border.light,
              letterSpacing: 0,
              '& .MuiChip-icon': {
                color: theme.palette.status.info,
              },
            })}
          />

          <Stack alignItems="center" gap={1.35} sx={{ maxWidth: 820 }}>
            <Typography
              variant="h1"
              fontWeight={800}
              sx={(theme) => ({
                color: theme.palette.text.primary,
                fontSize: { xs: '2.75rem', sm: '4.25rem', lg: '5.65rem' },
                lineHeight: 0.98,
                textAlign: 'center',
                letterSpacing: 0,
                textShadow: [
                  `0 0 20px ${alpha(theme.palette.common.white, 0.22)}`,
                  `0 0 56px ${alpha(theme.palette.primary.main, 0.34)}`,
                ].join(', '),
              })}
            >
              Gittensor
            </Typography>
            <Typography
              variant="body1"
              sx={(theme) => ({
                color: theme.palette.text.tertiary,
                textAlign: 'center',
                maxWidth: 600,
                lineHeight: 1.7,
                fontSize: { xs: '0.84rem', sm: '0.96rem' },
              })}
            >
              The workforce for open source. Find valuable work, ship quality
              pull requests, and earn from useful contributions.
            </Typography>
            <Button
              component={RouterLink}
              to="/onboard"
              variant="contained"
              endIcon={<ArrowForwardIcon sx={{ fontSize: '1.05rem' }} />}
              aria-label="Get started with Gittensor onboarding"
              sx={(theme) => ({
                mt: 0.75,
                minHeight: 44,
                px: 3.25,
                py: 1,
                color: theme.palette.common.white,
                textTransform: 'none',
                fontSize: '0.9375rem',
                fontWeight: 700,
                letterSpacing: 0.01,
                borderRadius: 999,
                border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${CTA_GRADIENT_COLORS.shadeDark} 45%, ${alpha(theme.palette.primary.main, 0.92)} 100%)`,
                boxShadow: [
                  `0 0 0 1px ${alpha(theme.palette.common.white, 0.06)} inset`,
                  `0 4px 24px ${alpha(theme.palette.primary.main, 0.45)}`,
                  `0 0 48px ${alpha(theme.palette.primary.main, 0.25)}`,
                ].join(', '),
                '& .MuiButton-endIcon': { ml: 0.5 },
                '&:hover': {
                  background: `linear-gradient(135deg, ${CTA_GRADIENT_COLORS.shadeLight} 0%, ${theme.palette.primary.main} 55%, ${CTA_GRADIENT_COLORS.shadeDark} 100%)`,
                  boxShadow: [
                    `0 0 0 1px ${alpha(theme.palette.common.white, 0.1)} inset`,
                    `0 6px 32px ${alpha(theme.palette.primary.main, 0.55)}`,
                    `0 0 64px ${alpha(theme.palette.primary.main, 0.35)}`,
                  ].join(', '),
                },
                '&:focus-visible': {
                  outline: `2px solid ${alpha(theme.palette.primary.main, 0.9)}`,
                  outlineOffset: 3,
                },
              })}
            >
              Get started
            </Button>
          </Stack>

          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 1100,
              mt: { xs: 1, sm: 1.5 },
            }}
          >
            <HeroPortal />
            <MonthlyRewardSummary amount={monthlyRewards ?? null} />
          </Box>
        </Stack>
      </Box>
    </Page>
  );
};

export default HomePage;
