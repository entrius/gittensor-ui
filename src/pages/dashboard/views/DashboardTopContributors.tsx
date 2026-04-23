import React from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { getGithubAvatarSrc } from '../../../utils';
import {
  type DashboardFeaturedContributor,
  type DashboardFeaturedWork,
} from '../dashboardData';

interface DashboardTopContributorsProps {
  featuredWork: DashboardFeaturedWork;
  contributors: DashboardFeaturedContributor[];
  isLoading?: boolean;
}

const formatShortDate = (timestamp: string | null) => {
  if (!timestamp) return 'Unknown date';
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 'Unknown date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(parsed));
};

const formatBounty = (value: number) => {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} TAO`;
};

const getRepoName = (fullName: string) => fullName.split('/').pop() || fullName;
const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const DashboardTopContributors: React.FC<DashboardTopContributorsProps> = ({
  featuredWork,
  contributors,
  isLoading = false,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const monoFontFamily = theme.typography.fontFamily;

  const hasAnyHighlights =
    featuredWork.prs.length > 0 ||
    featuredWork.issues.length > 0 ||
    contributors.length > 0;

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
          Featured Work
        </Typography>
        <Typography
          sx={{
            mt: 0.35,
            color: alpha(theme.palette.text.primary, 0.62),
            fontFamily: monoFontFamily,
            fontSize: { xs: '0.72rem', sm: '0.74rem' },
            fontWeight: 500,
            lineHeight: 1.35,
          }}
        >
          Standout merged PRs and completed bounty issues in this period.
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
      ) : !hasAnyHighlights ? (
        <Typography
          sx={{
            color: 'text.secondary',
            fontFamily: monoFontFamily,
            fontSize: '0.8rem',
          }}
        >
          No standout merged PRs, completed issues, or contributor highlights for
          the selected window.
        </Typography>
      ) : (
        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 1.25,
          }}
        >
          <Stack
            spacing={0.8}
            sx={{
              border: `1px solid ${theme.palette.border.light}`,
              borderRadius: 3,
              p: 1.15,
            }}
          >
            <Typography
              sx={{
                color: theme.palette.text.primary,
                fontFamily: monoFontFamily,
                fontSize: '0.86rem',
                fontWeight: 700,
              }}
            >
              Standout merged PRs
            </Typography>
            {featuredWork.prs.length === 0 ? (
              <Typography
                sx={{
                  color: alpha(theme.palette.text.primary, 0.68),
                  fontFamily: monoFontFamily,
                  fontSize: '0.75rem',
                }}
              >
                No merged PR highlights in this window.
              </Typography>
            ) : (
              featuredWork.prs.map((pr, index) => (
                <Box key={`${pr.repository}-${pr.pullRequestNumber}`}>
                  {index > 0 && (
                    <Divider
                      sx={{
                        borderColor: theme.palette.border.light,
                        my: 0.8,
                      }}
                    />
                  )}
                  <Stack
                    spacing={0.45}
                    onClick={() =>
                      navigate(
                        `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(
                          `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                        );
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1.5,
                      p: 0.55,
                      transition:
                        'border-color 0.18s ease, background-color 0.18s ease',
                      '&:hover': {
                        backgroundColor: theme.palette.surface.subtle,
                      },
                      '&:focus-visible': {
                        outline: `2px solid ${alpha(theme.palette.status.merged, 0.45)}`,
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        color: theme.palette.text.primary,
                        fontFamily: monoFontFamily,
                        fontSize: '0.77rem',
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {getRepoName(pr.repository)} #{pr.pullRequestNumber}
                    </Typography>
                    <Typography
                      sx={{
                        color: alpha(theme.palette.text.primary, 0.76),
                        fontFamily: monoFontFamily,
                        fontSize: '0.72rem',
                        lineHeight: 1.32,
                      }}
                    >
                      {pr.title}
                    </Typography>
                    <Typography
                      sx={{
                        color: alpha(theme.palette.diff.additions, 0.9),
                        fontFamily: monoFontFamily,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      Score {Math.round(pr.score).toLocaleString()}
                      <Box
                        component="span"
                        sx={{
                          color: alpha(theme.palette.text.primary, 0.58),
                          fontWeight: 500,
                          ml: 0.75,
                        }}
                      >
                        {pr.commitCount.toLocaleString()} commits ·{' '}
                        {pr.linesChanged.toLocaleString()} lines · @{pr.author}{' '}
                        · merged {formatShortDate(pr.mergedAt)}
                      </Box>
                    </Typography>
                  </Stack>
                </Box>
              ))
            )}
          </Stack>

          <Stack
            spacing={0.8}
            sx={{
              border: `1px solid ${theme.palette.border.light}`,
              borderRadius: 3,
              p: 1.15,
            }}
          >
            <Typography
              sx={{
                color: theme.palette.text.primary,
                fontFamily: monoFontFamily,
                fontSize: '0.86rem',
                fontWeight: 700,
              }}
            >
              Completed issues
            </Typography>
            {featuredWork.issues.length === 0 ? (
              <Typography
                sx={{
                  color: alpha(theme.palette.text.primary, 0.68),
                  fontFamily: monoFontFamily,
                  fontSize: '0.75rem',
                }}
              >
                No completed bounty issues in this window.
              </Typography>
            ) : (
              featuredWork.issues.map((issue, index) => (
                <Box key={issue.id}>
                  {index > 0 && (
                    <Divider
                      sx={{
                        borderColor: theme.palette.border.light,
                        my: 0.8,
                      }}
                    />
                  )}
                  <Stack
                    spacing={0.45}
                    onClick={() => navigate(`/bounties/details?id=${issue.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/bounties/details?id=${issue.id}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1.5,
                      p: 0.55,
                      transition:
                        'border-color 0.18s ease, background-color 0.18s ease',
                      '&:hover': {
                        backgroundColor: theme.palette.surface.subtle,
                      },
                      '&:focus-visible': {
                        outline: `2px solid ${alpha(theme.palette.status.merged, 0.45)}`,
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        color: theme.palette.text.primary,
                        fontFamily: monoFontFamily,
                        fontSize: '0.77rem',
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {getRepoName(issue.repositoryFullName)} #
                      {issue.issueNumber}
                    </Typography>
                    <Typography
                      sx={{
                        color: alpha(theme.palette.text.primary, 0.76),
                        fontFamily: monoFontFamily,
                        fontSize: '0.72rem',
                        lineHeight: 1.32,
                      }}
                    >
                      {issue.title}
                    </Typography>
                    <Typography
                      sx={{
                        color: alpha(theme.palette.status.award, 0.92),
                        fontFamily: monoFontFamily,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      Target {formatBounty(issue.targetBounty)}
                      <Box
                        component="span"
                        sx={{
                          color: alpha(theme.palette.text.primary, 0.58),
                          fontWeight: 500,
                          ml: 0.75,
                        }}
                      >
                        Bounty {formatBounty(issue.bountyAmount)} · completed{' '}
                        {formatShortDate(issue.completedAt)}
                      </Box>
                    </Typography>
                  </Stack>
                </Box>
              ))
            )}
          </Stack>

          <Stack
            spacing={0.8}
            sx={{
              border: `1px solid ${theme.palette.border.light}`,
              borderRadius: 3,
              p: 1.15,
              gridColumn: {
                xs: 'auto',
                lg: '1 / -1',
              },
            }}
          >
            <Typography
              sx={{
                color: theme.palette.text.primary,
                fontFamily: monoFontFamily,
                fontSize: '0.86rem',
                fontWeight: 700,
              }}
            >
              Featured Contributors
            </Typography>
            {contributors.length === 0 ? (
              <Typography
                sx={{
                  color: alpha(theme.palette.text.primary, 0.68),
                  fontFamily: monoFontFamily,
                  fontSize: '0.75rem',
                }}
              >
                No contributor highlights in this window.
              </Typography>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                    xl: `repeat(${Math.min(contributors.length, 3)}, minmax(220px, 1fr))`,
                  },
                  gap: 1,
                }}
              >
                {contributors.map((contributor) => {
                  const avatarUsername =
                    contributor.githubUsername ?? contributor.githubId;
                  return (
                    <Stack
                      key={`${contributor.featuredLabel}-${contributor.githubId}`}
                      spacing={0.6}
                      onClick={() =>
                        navigate(
                          `/miners/details?githubId=${encodeURIComponent(contributor.githubId)}`,
                          { state: { backTo: '/dashboard' } },
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(
                            `/miners/details?githubId=${encodeURIComponent(contributor.githubId)}`,
                            { state: { backTo: '/dashboard' } },
                          );
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      sx={{
                        p: 0.85,
                        borderRadius: 2.2,
                        border: `1px solid ${theme.palette.border.light}`,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: theme.palette.surface.subtle,
                        },
                        '&:focus-visible': {
                          outline: `2px solid ${alpha(theme.palette.status.merged, 0.45)}`,
                          outlineOffset: '2px',
                        },
                      }}
                    >
                      <Stack direction="row" spacing={0.8} alignItems="center">
                        <Avatar
                          src={getGithubAvatarSrc(avatarUsername)}
                          alt={avatarUsername}
                          sx={{
                            width: 36,
                            height: 36,
                            fontSize: '0.74rem',
                            fontFamily: monoFontFamily,
                            bgcolor: theme.palette.surface.light,
                            border: `1px solid ${theme.palette.border.light}`,
                          }}
                        >
                          {getInitials(contributor.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              color: theme.palette.text.primary,
                              fontFamily: monoFontFamily,
                              fontSize: '0.74rem',
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
                              color: alpha(theme.palette.status.award, 0.88),
                              fontFamily: monoFontFamily,
                              fontSize: '0.66rem',
                              fontWeight: 700,
                            }}
                          >
                            {contributor.featuredLabel}
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography
                        sx={{
                          color: alpha(theme.palette.text.primary, 0.68),
                          fontFamily: monoFontFamily,
                          fontSize: '0.67rem',
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
                                color: alpha(
                                  theme.palette.diff.additions,
                                  0.92,
                                ),
                                fontWeight: 700,
                              }}
                            >
                              {metric.value}
                            </Box>
                            {metric.unit ? ` ${metric.unit}` : ''}
                          </Box>
                        ))}
                      </Typography>
                    </Stack>
                  );
                })}
              </Box>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default DashboardTopContributors;
