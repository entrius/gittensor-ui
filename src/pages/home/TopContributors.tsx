import React, { useMemo } from 'react';
import { Avatar, Box, Grid, Stack, Typography, alpha } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAllMiners } from '../../api';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';

const TOP_N = 4;

const formatUsd = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const TopContributors: React.FC = () => {
  const { data: miners } = useAllMiners();

  const top = useMemo(() => {
    if (!miners) return [];
    return [...miners]
      .filter((m) => (m.usdPerDay ?? 0) > 0 && (m.githubUsername || m.githubId))
      .sort((a, b) => (b.usdPerDay ?? 0) - (a.usdPerDay ?? 0))
      .slice(0, TOP_N);
  }, [miners]);

  if (top.length === 0) return null;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1100,
        mx: 'auto',
        mt: { xs: 5, sm: 7 },
      }}
    >
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        flexWrap="wrap"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Typography
          sx={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 600,
            color: 'text.secondary',
          }}
        >
          Top contributors right now
        </Typography>
        <Typography
          component={RouterLink}
          to="/dashboard"
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.6,
            borderRadius: 999,
            fontSize: '0.78rem',
            fontWeight: 700,
            color: theme.palette.status.award,
            backgroundColor: alpha(theme.palette.status.award, 0.12),
            border: `1px solid ${alpha(theme.palette.status.award, 0.45)}`,
            textDecoration: 'none',
            boxShadow: `0 0 12px ${alpha(theme.palette.status.award, 0.25)}`,
            transition: 'box-shadow 0.18s, background-color 0.18s',
            '&:hover': {
              backgroundColor: alpha(theme.palette.status.award, 0.2),
              boxShadow: `0 0 18px ${alpha(theme.palette.status.award, 0.5)}`,
            },
          })}
        >
          Go to dashboard →
        </Typography>
      </Stack>
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {top.map((miner) => {
          const username = miner.githubUsername || miner.githubId;
          const avatar = getGithubAvatarSrc(username);
          const usd = miner.usdPerDay ?? 0;
          const merged = miner.totalMergedPrs ?? 0;
          return (
            <Grid item xs={12} sm={6} md={3} key={miner.githubId}>
              <Stack
                component={RouterLink}
                to={`/miners/details?githubId=${encodeURIComponent(miner.githubId)}`}
                spacing={1.25}
                sx={(theme) => ({
                  height: '100%',
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.border.light}`,
                  backgroundColor: alpha(
                    theme.palette.background.default,
                    0.45,
                  ),
                  textDecoration: 'none',
                  color: 'inherit',
                  transition:
                    'border-color 0.18s, transform 0.18s, box-shadow 0.18s',
                  '&:hover': {
                    borderColor: theme.palette.border.medium,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(
                      theme.palette.background.default,
                      0.35,
                    )}`,
                  },
                })}
              >
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <Avatar
                    src={avatar}
                    alt={username}
                    sx={(theme) => ({
                      width: 38,
                      height: 38,
                      border: `1px solid ${theme.palette.border.medium}`,
                    })}
                  />
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {username}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        color: 'text.tertiary',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      {merged.toLocaleString()} merged PRs
                    </Typography>
                  </Stack>
                </Stack>
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 600,
                      color: 'text.tertiary',
                    }}
                  >
                    Earning
                  </Typography>
                  <Typography
                    sx={(theme) => ({
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: theme.palette.diff.additions,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.1,
                    })}
                  >
                    {formatUsd(usd)}
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: 'inherit',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        color: 'text.tertiary',
                        ml: 0.5,
                      }}
                    >
                      / day
                    </Typography>
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default TopContributors;
