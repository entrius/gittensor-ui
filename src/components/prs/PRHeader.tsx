import React from 'react';
import { Box, Typography, Avatar, Tooltip, alpha } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';
import { formatUsdEstimate, getPrStateColor } from '../../utils';
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
  const navigate = useNavigate();
  const [owner] = repository.split('/');

  const isOpenPR = prDetails.prState === 'OPEN';
  const isClosed = prDetails.prState === 'CLOSED';
  const collateralScore = parseFloat(prDetails.collateralScore || '0');
  const earnedScore = parseFloat(prDetails.earnedScore || '0');
  const predictedUsdPerDay = prDetails.predictedUsdPerDay;
  const ownerAvatarBackground = getRepositoryOwnerAvatarBackground(owner);
  const statusColor = getPrStateColor(prDetails.prState, STATUS_COLORS);

  return (
    <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box
        onClick={() =>
          navigate(
            `/miners/repository?name=${encodeURIComponent(repository)}`,
            { state: { backLabel: `Back to PR #${pullRequestNumber}` } },
          )
        }
        sx={{
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
              fontFamily: '"JetBrains Mono", monospace',
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
            onClick={() =>
              navigate(
                `/miners/repository?name=${encodeURIComponent(repository)}`,
                { state: { backLabel: `Back to PR #${pullRequestNumber}` } },
              )
            }
            sx={{
              color: 'text.tertiary',
              fontFamily: '"JetBrains Mono", monospace',
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
                      fontFamily: '"JetBrains Mono", monospace',
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
                    fontFamily: '"JetBrains Mono", monospace',
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
                  fontFamily: '"JetBrains Mono", monospace',
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
                      fontFamily: '"JetBrains Mono", monospace',
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
                    fontFamily: '"JetBrains Mono", monospace',
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
                  fontFamily: '"JetBrains Mono", monospace',
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
                fontFamily: '"JetBrains Mono", monospace',
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
                fontFamily: '"JetBrains Mono", monospace',
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
                        fontFamily: '"JetBrains Mono", monospace',
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
                      fontFamily: '"JetBrains Mono", monospace',
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
