import React, { useMemo } from 'react';
import { Box, Grid, Stack, Typography, alpha } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useIssues } from '../../api';

const StarterBounties: React.FC = () => {
  const { data: issues } = useIssues('registered');

  const top = useMemo(() => {
    if (!issues) return [];
    return [...issues]
      .sort(
        (a, b) =>
          parseFloat(b.targetBounty || '0') - parseFloat(a.targetBounty || '0'),
      )
      .slice(0, 6);
  }, [issues]);

  if (top.length === 0) return null;

  return (
    <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto' }}>
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
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
          Open bounties — start now
        </Typography>
        <Typography
          component={RouterLink}
          to="/bounties"
          sx={{
            fontSize: '0.78rem',
            color: 'primary.main',
            textDecoration: 'none',
            fontWeight: 600,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          See all →
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {top.map((b) => {
          const reward = parseFloat(b.targetBounty || '0');
          return (
            <Grid item xs={12} sm={6} md={4} key={b.id}>
              <Stack
                component={RouterLink}
                to={`/bounties/details?id=${b.id}`}
                spacing={1.25}
                sx={(theme) => ({
                  height: '100%',
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.border.light}`,
                  backgroundColor: alpha(theme.palette.background.default, 0.4),
                  backdropFilter: 'blur(10px)',
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
                <Stack
                  direction="row"
                  alignItems="baseline"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography
                    sx={(theme) => ({
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      color: theme.palette.status.award,
                      lineHeight: 1,
                    })}
                  >
                    {reward > 0 ? `${reward.toFixed(2)} τ` : '—'}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      color: 'text.tertiary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '60%',
                    }}
                  >
                    {b.repositoryFullName}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {b.title || `Issue #${b.issueNumber}`}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: 'text.tertiary',
                    mt: 'auto',
                  }}
                >
                  #{b.issueNumber}
                </Typography>
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default StarterBounties;
