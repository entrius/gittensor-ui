import React, { useMemo } from 'react';
import { Box, Stack, Tooltip, Typography, alpha } from '@mui/material';
import { useStats } from '../../api';

const DAILY_ALPHA_EMISSIONS = 2952;

const SEGMENTS = [
  {
    key: 'owner',
    pct: 0.18,
    label: 'Subnet owner',
    tone: 'tertiary' as const,
    tooltip: 'Fixed 18% on-chain allocation to the subnet owner.',
  },
  {
    key: 'miners',
    pct: 0.41,
    label: 'Miners',
    tone: 'primary' as const,
    tooltip:
      'Distributed among miners by incentive scoring (PR quality, token score, repo weight).',
  },
  {
    key: 'validators',
    pct: 0.41,
    label: 'Validators + nominators',
    tone: 'secondary' as const,
    tooltip:
      'Split by stake. A validator’s "take %" is their cut from nominator rewards — not a slice of the total 41%.',
  },
];

const MinerEmissionShare: React.FC = () => {
  const { data: stats } = useStats();
  const taoPrice = stats?.prices?.tao?.data?.price ?? null;
  const alphaPrice = stats?.prices?.alpha?.data?.price ?? null;

  const { dailyMinerUsd, monthlyPoolUsd } = useMemo(() => {
    if (!taoPrice || !alphaPrice) {
      return { dailyMinerUsd: null, monthlyPoolUsd: null };
    }
    const dailyTotal = taoPrice * alphaPrice * DAILY_ALPHA_EMISSIONS;
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    return {
      dailyMinerUsd: dailyTotal * 0.41,
      monthlyPoolUsd: dailyTotal * daysInMonth,
    };
  }, [taoPrice, alphaPrice]);

  const formatUsd = (n: number, fractionDigits = 0) =>
    `$${n.toLocaleString(undefined, {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
    })}`;

  return (
    <Box
      sx={(theme) => ({
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        ml: '-50vw',
        mr: '-50vw',
        my: { xs: 4, sm: 5 },
        py: { xs: 4, sm: 5 },
        px: { xs: 2, sm: 4 },
        borderTop: `1px solid ${theme.palette.border.light}`,
        borderBottom: `1px solid ${theme.palette.border.light}`,
        backgroundColor: alpha(theme.palette.background.default, 0.55),
      })}
    >
      <Stack
        sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}
        spacing={3}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2.5, sm: 4 }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography
              sx={{
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 600,
                color: 'text.secondary',
                mb: 0.5,
              }}
            >
              Monthly reward pool
            </Typography>
            <Typography
              sx={(theme) => ({
                fontSize: { xs: '2rem', sm: '2.75rem' },
                fontWeight: 700,
                color: theme.palette.text.primary,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              })}
            >
              {monthlyPoolUsd !== null ? formatUsd(monthlyPoolUsd, 2) : '—'}
            </Typography>
          </Box>
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography
              sx={{
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 600,
                color: 'text.secondary',
                mb: 0.5,
              }}
            >
              Flowing to miners
            </Typography>
            <Typography
              sx={(theme) => ({
                fontSize: { xs: '1.5rem', sm: '1.85rem' },
                fontWeight: 700,
                color: theme.palette.diff.additions,
                letterSpacing: '-0.01em',
                lineHeight: 1,
              })}
            >
              {dailyMinerUsd !== null ? formatUsd(dailyMinerUsd, 0) : '—'}
              <Typography
                component="span"
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'text.tertiary',
                  ml: 0.75,
                }}
              >
                / day
              </Typography>
            </Typography>
          </Box>
        </Stack>

        <Box>
          <Stack
            direction="row"
            sx={(theme) => ({
              height: 14,
              borderRadius: 999,
              overflow: 'hidden',
              border: `1px solid ${theme.palette.border.light}`,
            })}
          >
            {SEGMENTS.map((seg) => (
              <Tooltip
                key={seg.key}
                title={`${Math.round(seg.pct * 100)}% — ${seg.label}. ${seg.tooltip}`}
                placement="top"
                arrow
              >
                <Box
                  sx={(theme) => ({
                    flex: seg.pct,
                    backgroundColor:
                      seg.tone === 'primary'
                        ? theme.palette.diff.additions
                        : seg.tone === 'secondary'
                          ? theme.palette.status.award
                          : alpha(theme.palette.text.primary, 0.25),
                    transition: 'opacity 0.2s',
                    cursor: 'help',
                    '&:hover': { opacity: 0.85 },
                  })}
                />
              </Tooltip>
            ))}
          </Stack>
          <Stack direction="row" sx={{ mt: 1.25 }}>
            {SEGMENTS.map((seg) => (
              <Box
                key={seg.key}
                sx={{ flex: seg.pct, minWidth: 0, pr: 1 }}
              >
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Box
                    sx={(theme) => ({
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor:
                        seg.tone === 'primary'
                          ? theme.palette.diff.additions
                          : seg.tone === 'secondary'
                            ? theme.palette.status.award
                            : alpha(theme.palette.text.primary, 0.25),
                      flexShrink: 0,
                    })}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'text.primary',
                    }}
                  >
                    {Math.round(seg.pct * 100)}%
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.74rem',
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {seg.label}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        <Typography
          sx={{
            fontSize: '0.72rem',
            color: 'text.tertiary',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          Validator + nominator share is divided by stake. A validator&rsquo;s
          &ldquo;take %&rdquo; is the cut they keep from their nominators&rsquo;
          rewards, not a slice of total emissions.
        </Typography>
      </Stack>
    </Box>
  );
};

export default MinerEmissionShare;
