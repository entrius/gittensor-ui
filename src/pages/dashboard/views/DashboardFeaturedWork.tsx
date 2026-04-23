import React from 'react';
import GitHubIcon from '@mui/icons-material/GitHub';
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
import { type DashboardFeaturedWork } from '../dashboardData';

interface DashboardFeaturedWorkProps {
  items: DashboardFeaturedWork[];
  isLoading?: boolean;
}

const UTC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

const DashboardFeaturedWorkSection: React.FC<DashboardFeaturedWorkProps> = ({
  items,
  isLoading = false,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const monoFontFamily = theme.typography.fontFamily;

  const getToneColor = (tone: DashboardFeaturedWork['statusTone']) => {
    if (tone === 'merged') return theme.palette.status.merged;
    if (tone === 'closed') return theme.palette.status.closed;
    return theme.palette.status.open;
  };

  const openDetails = (item: DashboardFeaturedWork) => {
    if (item.kind === 'pr') {
      navigate(
        `/miners/pr?repo=${encodeURIComponent(item.repository)}&number=${encodeURIComponent(String(item.prNumber ?? ''))}`,
      );
      return;
    }
    navigate(
      `/bounties/details?id=${encodeURIComponent(String(item.issueId ?? ''))}`,
    );
  };

  const formatUtcDate = (value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return UTC_DATE_TIME_FORMATTER.format(date).replace(',', '');
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
      <Stack
        direction="row"
        justifyContent="flex-start"
        alignItems="center"
        sx={{ mb: 1.35 }}
      >
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
      </Stack>

      {isLoading ? (
        <Box
          sx={{
            minHeight: 170,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={28} />
        </Box>
      ) : items.length === 0 ? (
        <Typography
          sx={{
            color: 'text.secondary',
            fontFamily: monoFontFamily,
            fontSize: '0.8rem',
          }}
        >
          No featured PRs or issues available yet.
        </Typography>
      ) : (
        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gridAutoRows: '1fr',
            gap: 1.15,
          }}
        >
          {items.slice(0, 6).map((item) => {
            const toneColor = getToneColor(item.statusTone);
            const repoOwner = item.repository.split('/')[0] || '';
            const metricsToShow = item.metrics.slice(0, 3);
            const metricCount = metricsToShow.length || 1;

            return (
              <Stack
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetails(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDetails(item);
                  }
                }}
                sx={{
                  height: '100%',
                  minHeight: 262,
                  p: 0.9,
                  fontFamily: monoFontFamily,
                  backgroundColor: alpha(theme.palette.common.white, 0.015),
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.border.light}`,
                  display: 'grid',
                  gridTemplateRows: 'auto auto 2.56em auto auto',
                  rowGap: 0.62,
                  cursor: 'pointer',
                  transition:
                    'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    borderColor: alpha(theme.palette.text.primary, 0.24),
                    boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.28)}`,
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${alpha(toneColor, 0.45)}`,
                    outlineOffset: '2px',
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '52px minmax(0, 1fr)',
                    columnGap: 0.5,
                    alignItems: 'center',
                    minWidth: 0,
                    mt: 0.02,
                  }}
                >
                  <Avatar
                    src={getGithubAvatarSrc(repoOwner)}
                    alt={repoOwner}
                    sx={{
                      width: 52,
                      height: 52,
                      bgcolor: theme.palette.surface.light,
                      border: `1px solid ${theme.palette.border.light}`,
                      '& .MuiSvgIcon-root': { fontSize: 27 },
                    }}
                  >
                    <GitHubIcon />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: theme.palette.text.primary,
                        fontFamily: 'inherit',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        letterSpacing: '0.01em',
                        lineHeight: 1.05,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                      }}
                    >
                      {item.repository}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.14,
                        color:
                          item.kind === 'issue'
                            ? alpha(theme.palette.status.award, 0.9)
                            : alpha(theme.palette.status.merged, 0.9),
                        fontFamily: monoFontFamily,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.featuredLabel}
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  sx={{
                    color: alpha(theme.palette.text.primary, 0.78),
                    fontFamily: 'inherit',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    lineHeight: 1.28,
                    height: '2.52em',
                    display: '-webkit-box',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.title}
                </Typography>

                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Avatar
                    src={getGithubAvatarSrc(item.githubUsername)}
                    alt={item.authorLabel}
                    sx={{
                      width: 18,
                      height: 18,
                      fontSize: '0.6rem',
                      bgcolor: theme.palette.surface.light,
                      border: `1px solid ${theme.palette.border.light}`,
                    }}
                  >
                    {item.authorLabel.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Typography
                    sx={{
                      color: alpha(theme.palette.text.primary, 0.64),
                      fontFamily: monoFontFamily,
                      fontSize: '0.74rem',
                      fontWeight: 600,
                    }}
                  >
                    by {item.authorLabel}
                  </Typography>
                </Stack>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    pt: 0.6,
                    borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.2)}`,
                  }}
                >
                  <Box
                    sx={{
                      px: 0.72,
                      py: 0.16,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(toneColor, 0.55)}`,
                      bgcolor: alpha(toneColor, 0.1),
                    }}
                  >
                    <Typography
                      sx={{
                        color: alpha(toneColor, 0.92),
                        fontFamily: monoFontFamily,
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        lineHeight: 1.1,
                      }}
                    >
                      {item.statusLabel}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      color: alpha(theme.palette.text.primary, 0.7),
                      fontFamily: monoFontFamily,
                      fontSize: '0.72rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatUtcDate(item.openedAt)}
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    pt: 0.6,
                    borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.2)}`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${metricCount}, minmax(0, 1fr))`,
                      gap: 0,
                    }}
                  >
                    {metricsToShow.map((metric, metricIndex) => {
                      const columnAlign =
                        metricCount === 2
                          ? metricIndex === 0
                            ? 'flex-start'
                            : 'flex-end'
                          : metricIndex === 0
                            ? 'flex-start'
                            : metricIndex === 1
                              ? 'center'
                              : 'flex-end';
                      const textAlign =
                        metricCount === 2
                          ? metricIndex === 0
                            ? 'left'
                            : 'right'
                          : metricIndex === 0
                            ? 'left'
                            : metricIndex === 1
                              ? 'center'
                              : 'right';
                      const metricColor =
                        metric.tone === 'negative'
                          ? alpha(theme.palette.diff.deletions, 0.82)
                          : metric.tone === 'positive'
                            ? alpha(theme.palette.diff.additions, 0.82)
                            : alpha(theme.palette.text.primary, 0.9);
                      return (
                        <Stack
                          key={`${item.id}-${metric.label}`}
                          spacing={0.2}
                          sx={{
                            alignItems: columnAlign,
                            px: 0.65,
                          }}
                        >
                          <Typography
                            sx={{
                              color: alpha(theme.palette.text.primary, 0.58),
                              fontFamily: monoFontFamily,
                              fontSize: '0.74rem',
                              textAlign,
                            }}
                          >
                            {metric.label}
                          </Typography>
                          <Typography
                            sx={{
                              color: metricColor,
                              fontFamily: monoFontFamily,
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              lineHeight: 1.15,
                              textAlign,
                            }}
                          >
                            {metric.label === 'Changes' &&
                            metric.value.includes(' / -') ? (
                              <>
                                {metric.value.split(' / -')[0]}
                                <Box
                                  component="span"
                                  sx={{
                                    color: alpha(
                                      theme.palette.text.primary,
                                      0.9,
                                    ),
                                  }}
                                >
                                  {' '}
                                  /
                                </Box>
                                <Box
                                  component="span"
                                  sx={{
                                    color: alpha(
                                      theme.palette.diff.deletions,
                                      0.86,
                                    ),
                                  }}
                                >
                                  {' '}
                                  -{metric.value.split(' / -')[1]}
                                </Box>
                              </>
                            ) : (
                              metric.value
                            )}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Box>
                </Box>
              </Stack>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default DashboardFeaturedWorkSection;
