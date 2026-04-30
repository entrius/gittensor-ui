import React, { useMemo } from 'react';
import { Box, Skeleton, Stack, Typography, alpha } from '@mui/material';
import { CARD_LAYOUT, HERO_GEOMETRY } from './heroConstants';

export interface MonthlyRewardSummaryProps {
  amount: number | null;
}

const wholeFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const MonthlyRewardSummary: React.FC<MonthlyRewardSummaryProps> = ({
  amount,
}) => {
  const wholeAmount = useMemo(
    () => (amount == null ? null : wholeFormatter.format(Math.round(amount))),
    [amount],
  );
  const isLoading = wholeAmount == null;

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      gap={{ xs: 1.5, sm: 2 }}
      sx={{
        position: 'relative',
        zIndex: 6,
        width: `${CARD_LAYOUT.widthPct.toFixed(2)}%`,
        maxWidth: HERO_GEOMETRY.diskWidth,
        mx: 'auto',
        mt: `-${CARD_LAYOUT.marginPct.toFixed(2)}%`,
        px: { xs: 2, sm: 3 },
        pt: { xs: 4, sm: 5 },
        pb: { xs: 2, sm: 3 },
        background: 'transparent',
        textAlign: 'center',
      }}
    >
      <Box
        aria-hidden
        sx={(theme) => ({
          width: 48,
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${alpha(
            theme.palette.primary.main,
            0.7,
          )} 50%, transparent 100%)`,
        })}
      />

      <Typography
        sx={(theme) => ({
          color: theme.palette.text.secondary,
          fontSize: '0.6875rem',
          letterSpacing: '0.32em',
          fontWeight: 600,
          textTransform: 'uppercase',
          lineHeight: 1,
        })}
      >
        Monthly Reward Pool
      </Typography>

      <Box
        sx={(theme) => ({
          position: 'relative',
          px: { xs: 2, sm: 3 },
          py: { xs: 1, sm: 1.25 },
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '-20% -10%',
            background: `radial-gradient(60% 60% at 50% 50%, ${alpha(
              theme.palette.primary.main,
              0.32,
            )} 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: -1,
            filter: 'blur(2px)',
          },
        })}
      >
        {isLoading ? (
          <Skeleton
            variant="text"
            aria-label="Loading monthly reward pool"
            sx={{
              width: { xs: 240, sm: 360, md: 460 },
              height: { xs: '3.25rem', sm: '4.75rem', md: '6rem' },
              borderRadius: 2,
              mx: 'auto',
            }}
          />
        ) : (
          <Stack
            direction="row"
            alignItems="baseline"
            justifyContent="center"
            gap={{ xs: 0.5, sm: 0.75 }}
            aria-label={`Monthly reward pool ${wholeAmount} US dollars`}
          >
            <Typography
              component="span"
              aria-hidden
              sx={(theme) => ({
                color: alpha(theme.palette.common.white, 0.78),
                fontWeight: 600,
                fontSize: { xs: '1.85rem', sm: '2.6rem', md: '3.25rem' },
                lineHeight: 1,
                letterSpacing: '-0.01em',
                fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 24px ${alpha(theme.palette.primary.main, 0.45)}`,
              })}
            >
              $
            </Typography>
            <Typography
              component="span"
              aria-hidden
              sx={(theme) => ({
                color: theme.palette.common.white,
                fontWeight: 800,
                fontSize: { xs: '3.25rem', sm: '4.75rem', md: '6rem' },
                lineHeight: 1,
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
                textShadow: [
                  `0 1px 2px ${alpha(theme.palette.common.black, 0.45)}`,
                  `0 0 36px ${alpha(theme.palette.primary.main, 0.55)}`,
                ].join(', '),
              })}
            >
              {wholeAmount}
            </Typography>
            <Typography
              component="span"
              aria-hidden
              sx={(theme) => ({
                ml: { xs: 0.5, sm: 0.75 },
                color: theme.palette.text.secondary,
                fontWeight: 700,
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              })}
            >
              USD
            </Typography>
          </Stack>
        )}
      </Box>

      <Typography
        sx={(theme) => ({
          m: 0,
          color: theme.palette.text.tertiary,
          fontSize: '0.8125rem',
          lineHeight: 1.5,
        })}
      >
        Estimated pool available this month across all whitelisted repositories.
      </Typography>
    </Stack>
  );
};

export default MonthlyRewardSummary;
