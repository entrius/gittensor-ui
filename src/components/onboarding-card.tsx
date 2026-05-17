import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha, SxProps, Theme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useLinkBehavior } from './common/linkBehavior';

export type OnboardingCardContent = {
  kicker: string;
  headline: React.ReactNode;
  body: React.ReactNode;
  primaryLabel: string;
  primaryLink: ReturnType<typeof useLinkBehavior<HTMLAnchorElement>>;
  secondaryLabel: string;
  secondaryLink: ReturnType<typeof useLinkBehavior<HTMLAnchorElement>>;
};

interface OnboardingCardProps {
  content: OnboardingCardContent;
  /** Theme palette key for the accent stripe, gradient, and primary CTA. Defaults to `status.merged`. */
  accent?: (theme: Theme) => string;
  /** Optional sx merged into the outer card (e.g. entrance animation). */
  sx?: SxProps<Theme>;
}

const defaultAccent = (theme: Theme) => theme.palette.status.merged;

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  content,
  accent = defaultAccent,
  sx,
}) => (
  <Box
    sx={[
      (theme) => ({
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 3,
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        backgroundColor: theme.palette.surface.subtle,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.border.medium}`,
        borderTop: `3px solid ${accent(theme)}`,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 260,
      }),
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    <Box
      sx={(theme) => ({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        background: `linear-gradient(to bottom, ${alpha(accent(theme), 0.1)} 0%, transparent 100%)`,
        pointerEvents: 'none',
      })}
    />
    <Stack spacing={1.25} sx={{ position: 'relative', zIndex: 1 }}>
      <Typography
        sx={{
          color: 'text.secondary',
          fontSize: '0.66rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        {content.kicker}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: { xs: '2rem', md: '2.45rem' },
          lineHeight: 1,
        }}
      >
        {content.headline}
      </Typography>
      <Typography
        sx={(theme) => ({
          color: alpha(theme.palette.text.primary, 0.62),
          fontSize: '0.82rem',
          lineHeight: 1.6,
        })}
      >
        {content.body}
      </Typography>
    </Stack>
    <Stack
      direction={{ xs: 'column', sm: 'row', lg: 'column', xl: 'row' }}
      spacing={1}
      sx={{ position: 'relative', zIndex: 1 }}
    >
      <Button
        component="a"
        {...content.primaryLink}
        variant="contained"
        endIcon={<ArrowForwardIcon />}
        sx={(theme) => ({
          minHeight: 44,
          borderRadius: 1.5,
          backgroundColor: accent(theme),
          color: theme.palette.common.black,
          textTransform: 'none',
          fontWeight: 900,
          '&:hover': {
            backgroundColor: alpha(accent(theme), 0.9),
            transform: 'translateY(-1px)',
            boxShadow: `0 4px 12px ${alpha(accent(theme), 0.3)}`,
          },
          transition: 'all 0.2s ease',
        })}
      >
        {content.primaryLabel}
      </Button>
      <Button
        component="a"
        {...content.secondaryLink}
        variant="outlined"
        sx={(theme) => ({
          minHeight: 44,
          borderRadius: 1.5,
          borderColor: theme.palette.border.medium,
          color: theme.palette.text.primary,
          textTransform: 'none',
          fontWeight: 800,
          '&:hover': {
            borderColor: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.text.primary, 0.05),
          },
        })}
      >
        {content.secondaryLabel}
      </Button>
    </Stack>
  </Box>
);
