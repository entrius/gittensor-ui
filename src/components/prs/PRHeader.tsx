import React from 'react';
import { Box, Typography, Avatar, Button, Tooltip, alpha } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
import { formatDate, formatUsdEstimate } from '../../utils';
import { type PullRequestDetails } from '../../api/models/Dashboard';
import { STATUS_COLORS } from '../../theme';
import { getRepositoryOwnerAvatarBackground } from '../leaderboard/types';
interface PRHeaderProps {
  repository: string;
  pullRequestNumber: number;
  prDetails: PullRequestDetails;
}

const PRHeader: React.FC<PRHeaderProps> = ({
  repository,
  pullRequestNumber,
  prDetails,
}) => {
  const [owner] = repository.split('/');
  const repoLinkProps = useLinkBehavior<HTMLAnchorElement>(
    `/miners/repository?name=${encodeURIComponent(repository)}`,
    { state: { backLabel: `Back to PR #${pullRequestNumber}` } },
  );
  const authorLinkProps = useLinkBehavior<HTMLAnchorElement>(
    `/miners/details?githubId=${prDetails.githubId ?? ''}`,
    { state: { backLabel: `Back to PR #${pullRequestNumber}` } },
  );
  const githubPrUrl = `https://github.com/${repository}/pull/${pullRequestNumber}`;
  const mergedDateLabel = prDetails.mergedAt
    ? formatDate(prDetails.mergedAt)
    : null;
  const chipSx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.75,
    px: 1,
    py: 0.5,
    borderRadius: 1,
    border: '1px solid',
  };
  const isOpenPR = prDetails.prState === 'OPEN';
  const isClosed = prDetails.prState === 'CLOSED';
  const collateralScore = parseFloat(prDetails.collateralScore || '0');
  const earnedScore = parseFloat(prDetails.earnedScore || '0');
  const predictedUsdPerDay = prDetails.predictedUsdPerDay;
  const ownerAvatarBackground = getRepositoryOwnerAvatarBackground(owner);
  const statusColor =
    prDetails.prState === 'CLOSED'
      ? STATUS_COLORS.closed
      : prDetails.prState === 'MERGED'
        ? STATUS_COLORS.merged
        : STATUS_COLORS.open;

  return (
    <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box
        component="a"
        {...repoLinkProps}
        sx={{
          ...linkResetSx,
          cursor: 'pointer',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        }}
      >
        <Avatar
          src={`https://avatars.githubusercontent.com/${owner}`}
          alt={owner}
          sx={{
            width: 64,
            height: 64,
            border: '2px solid',
            borderColor: 'border.medium',
            backgroundColor: ownerAvatarBackground,
          }}
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Typography
            variant="h5"
            sx={{
              color: 'text.primary',
              fontSize: '1.3rem',
              fontWeight: 500,
            }}
          >
            #{pullRequestNumber}
          </Typography>
          <Box
            sx={{
              display: 'inline-block',
              px: 1,
              py: 0.25,
              borderRadius: 1,
              backgroundColor: alpha(statusColor, 0.2),
              border: '1px solid',
              borderColor: alpha(statusColor, 0.4),
            }}
          >
            <Typography
              sx={{
                color: statusColor,
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {prDetails.prState}
            </Typography>
          </Box>
          <Button
            component="a"
            href={githubPrUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="small"
            startIcon={<OpenInNewIcon />}
            aria-label="Open on GitHub"
            sx={{
              color: STATUS_COLORS.info,
              borderColor: alpha(STATUS_COLORS.info, 0.5),
              backgroundColor: alpha(STATUS_COLORS.info, 0.1),
              textTransform: 'none',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              fontWeight: 600,
              '&:hover': {
                borderColor: STATUS_COLORS.info,
                color: STATUS_COLORS.info,
                backgroundColor: alpha(STATUS_COLORS.info, 0.2),
              },
            }}
          >
            Open on GitHub
          </Button>
        </Box>
        <Typography
          sx={{
            color: 'text.primary',
            fontSize: '1rem',
            fontWeight: 400,
            mb: 0.5,
          }}
        >
          {prDetails.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            component="a"
            {...repoLinkProps}
            sx={{
              ...linkResetSx,
              color: 'text.tertiary',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'color 0.2s',
              '&:hover': {
                color: 'primary.main',
                textDecoration: 'underline',
              },
            }}
          >
            {repository}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            mt: 1,
          }}
        >
          {prDetails.authorLogin && (
            <Box
              component="a"
              {...authorLinkProps}
              sx={{
                ...linkResetSx,
                ...chipSx,
                borderColor: 'border.light',
                backgroundColor: 'surface.subtle',
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  '& .author-login': { color: 'primary.main' },
                },
              }}
            >
              <Avatar
                src={`https://avatars.githubusercontent.com/${prDetails.authorLogin}`}
                alt={prDetails.authorLogin}
                sx={{ width: 22, height: 22 }}
              />
              <Typography
                className="author-login"
                sx={{
                  color: 'text.primary',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'color 0.15s',
                }}
              >
                @{prDetails.authorLogin}
              </Typography>
            </Box>
          )}
          {mergedDateLabel && (
            <Box
              sx={{
                ...chipSx,
                borderColor: alpha(STATUS_COLORS.merged, 0.25),
                backgroundColor: alpha(STATUS_COLORS.merged, 0.08),
              }}
            >
              <EventAvailableIcon
                sx={{
                  fontSize: '0.95rem',
                  color: STATUS_COLORS.merged,
                }}
              />
              <Typography
                sx={{
                  color: 'text.primary',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                Merged {mergedDateLabel}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Score Section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 0.75,
        }}
      >
        {isOpenPR ? (
          /* Open PR: Show Potential Score | Collateral */
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5 }}>
            {/* Potential Score */}
            <Box sx={{ textAlign: 'right' }}>
              <Tooltip
                title="Potential score is an estimated earned score if this PR is merged. Some factors like the repository uniqueness multiplier depend on other miners' results at merge time and cannot be predicted exactly."
                arrow
                placement="top"
                slotProps={{
                  tooltip: {
                    sx: {
                      backgroundColor: 'surface.tooltip',
                      color: 'text.primary',
                      fontSize: '0.75rem',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: 'border.light',
                      maxWidth: 280,
                    },
                  },
                  arrow: {
                    sx: {
                      color: 'surface.tooltip',
                    },
                  },
                }}
              >
                <Typography
                  sx={{
                    color: 'text.tertiary',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    mb: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 0.5,
                    cursor: 'pointer',
                  }}
                >
                  Potential
                  <InfoOutlinedIcon sx={{ fontSize: '0.9rem' }} />
                </Typography>
              </Tooltip>
              <Typography
                sx={{
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  color: 'text.secondary',
                }}
              >
                {(collateralScore * 5).toFixed(2)}
              </Typography>
            </Box>

            {/* Divider */}
            <Box
              sx={{
                width: '1px',
                height: '55px',
                backgroundColor: 'border.light',
                mt: 0.5,
              }}
            />

            {/* Collateral */}
            <Box sx={{ textAlign: 'right' }}>
              <Tooltip
                title="Open collateral is deducted from your total score while PRs are open, preventing low-quality PR spam."
                arrow
                placement="top"
                slotProps={{
                  tooltip: {
                    sx: {
                      backgroundColor: 'surface.tooltip',
                      color: 'text.primary',
                      fontSize: '0.75rem',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: 'border.light',
                      maxWidth: 240,
                    },
                  },
                  arrow: {
                    sx: {
                      color: 'surface.tooltip',
                    },
                  },
                }}
              >
                <Typography
                  sx={{
                    color: 'text.tertiary',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    mb: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 0.5,
                    cursor: 'pointer',
                  }}
                >
                  Collateral
                  <InfoOutlinedIcon sx={{ fontSize: '0.9rem' }} />
                </Typography>
              </Tooltip>
              <Typography
                sx={{
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  color:
                    collateralScore > 0 ? 'risk.exceeded' : 'text.secondary',
                }}
              >
                {collateralScore > 0
                  ? `-${collateralScore.toFixed(2)}`
                  : collateralScore.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        ) : (
          /* Merged/Closed PR: Show Score */
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{
                color: 'text.tertiary',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.5,
              }}
            >
              Score
            </Typography>
            <Typography
              sx={{
                fontSize: '2.25rem',
                fontWeight: 700,
                lineHeight: 1,
                color: isClosed ? 'text.secondary' : 'text.primary',
              }}
            >
              {earnedScore.toFixed(2)}
            </Typography>
            {!isClosed &&
              predictedUsdPerDay != null &&
              predictedUsdPerDay > 0 && (
                <Tooltip
                  title="This is an estimation. Actual payouts depend on validator consensus, network incentive distribution, and other miners' scores."
                  arrow
                  placement="bottom"
                  slotProps={{
                    tooltip: {
                      sx: {
                        backgroundColor: 'surface.tooltip',
                        color: 'text.primary',
                        fontSize: '0.75rem',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: 'border.light',
                        maxWidth: 280,
                      },
                    },
                    arrow: {
                      sx: {
                        color: 'surface.tooltip',
                      },
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.95rem',
                      color: 'status.success',
                      opacity: 0.8,
                      mt: 0.5,
                      cursor: 'pointer',
                    }}
                  >
                    ~{formatUsdEstimate(predictedUsdPerDay, { showZero: true })}
                    /day
                  </Typography>
                </Tooltip>
              )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PRHeader;
