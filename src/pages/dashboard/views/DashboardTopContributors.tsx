import React from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { getGithubAvatarSrc } from '../../../utils';
import { getInitials } from '../../../utils/format';
import { type DashboardFeaturedContributor } from '../dashboardData';

interface DashboardTopContributorsProps {
  contributors: DashboardFeaturedContributor[];
  isLoading?: boolean;
}

const DashboardTopContributors: React.FC<DashboardTopContributorsProps> = ({
  contributors,
  isLoading = false,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const monoFontFamily = theme.typography.fontFamily;

  const openContributor = (githubId: string) => {
    navigate(`/miners/details?githubId=${encodeURIComponent(githubId)}`, {
      state: { backTo: '/dashboard' },
    });
  };

  return (
    <Box
      sx={{
        width: '100%',
        p: { xs: 1.45, sm: 1.65 },
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: 'transparent',
      }}
    >
      <Box sx={{ mb: 1.35 }}>
        <Typography
          sx={{
            color: theme.palette.text.primary,
            fontFamily: monoFontFamily,
            fontSize: { xs: '1.02rem', sm: '1.1rem' },
            fontWeight: 700,
          }}
        >
          Featured Contributors
        </Typography>
      </Box>

      {isLoading ? (
        <Box
          sx={{
            minHeight: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={28} />
        </Box>
      ) : contributors.length === 0 ? (
        <Typography
          sx={{
            color: 'text.secondary',
            fontFamily: monoFontFamily,
            fontSize: '0.8rem',
          }}
        >
          No contributor highlights available for the selected window.
        </Typography>
      ) : (
        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: `repeat(${Math.min(contributors.length, 3)}, minmax(250px, 360px))`,
            },
            justifyContent: {
              xs: 'stretch',
              lg: 'start',
            },
            gap: 1.25,
          }}
        >
          {contributors.map((contributor) => {
            const avatarUsername =
              contributor.githubUsername ?? contributor.githubId;

            return (
              <Stack
                key={`${contributor.featuredLabel}-${contributor.githubId}`}
                spacing={1}
                onClick={() => openContributor(contributor.githubId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openContributor(contributor.githubId);
                  }
                }}
                role="button"
                tabIndex={0}
                sx={{
                  width: '100%',
                  minWidth: 0,
                  p: 1.2,
                  pb: 0.9,
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.border.light}`,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition:
                    'border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease',
                  '&:hover': {
                    borderColor: alpha(theme.palette.status.merged, 0.3),
                    backgroundColor: theme.palette.surface.subtle,
                    transform: 'translateY(-1px)',
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${alpha(theme.palette.status.merged, 0.5)}`,
                    outlineOffset: '2px',
                  },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar
                    src={getGithubAvatarSrc(avatarUsername)}
                    alt={avatarUsername}
                    sx={{
                      width: 64,
                      height: 64,
                      fontSize: '1rem',
                      fontFamily: monoFontFamily,
                      bgcolor: theme.palette.surface.light,
                      color: theme.palette.text.primary,
                      border: `1px solid ${theme.palette.border.light}`,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(contributor.name)}
                  </Avatar>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: theme.palette.text.primary,
                        fontFamily: monoFontFamily,
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {contributor.name}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.16,
                        color: alpha(theme.palette.status.award, 0.88),
                        fontFamily: monoFontFamily,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        textTransform: 'none',
                      }}
                    >
                      {contributor.featuredLabel}
                    </Typography>
                  </Box>
                </Stack>

                <Stack spacing={0.55}>
                  <Typography
                    sx={{
                      color: alpha(theme.palette.text.primary, 0.68),
                      fontFamily: monoFontFamily,
                      fontSize: '0.74rem',
                      fontWeight: 500,
                      lineHeight: 1.35,
                    }}
                  >
                    {contributor.metrics.map((metric, index) => (
                      <Box
                        component="span"
                        key={`${metric.value}-${metric.unit}-${index}`}
                      >
                        {index > 0 ? ', ' : ''}
                        <Box
                          component="span"
                          sx={{
                            color: alpha(theme.palette.diff.additions, 0.92),
                            fontSize: 'inherit',
                            fontWeight: 700,
                          }}
                        >
                          {metric.value}
                        </Box>
                        {metric.unit ? ` ${metric.unit}` : ''}
                      </Box>
                    ))}
                  </Typography>

                  {contributor.repos.length > 0 && (
                    <Stack
                      direction="row"
                      spacing={0.55}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      {contributor.repos.map((repo) => (
                        <Box
                          key={`${contributor.githubId}-${repo}`}
                          sx={{
                            px: 0.85,
                            py: 0.38,
                            borderRadius: 999,
                            border: `1px solid ${theme.palette.border.light}`,
                            color: theme.palette.text.primary,
                            fontFamily: monoFontFamily,
                            fontSize: '0.66rem',
                            lineHeight: 1,
                          }}
                        >
                          {repo.split('/').pop() || repo}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Stack>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default DashboardTopContributors;
