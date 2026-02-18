import React from 'react';
import { Box, Typography, Avatar, Chip, Tooltip, alpha } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';
import { formatUsdEstimate } from '../../utils';
import theme, { TIER_COLORS, STATUS_COLORS } from '../../theme';
interface PRHeaderProps {
  repository: string;
  pullRequestNumber: number;
  prDetails: any; // Using any for now to avoid duplicating the full type definition, or import it if available
}

const PRHeader: React.FC<PRHeaderProps> = ({
  repository,
  pullRequestNumber,
  prDetails,
}) => {
  const navigate = useNavigate();
  const [owner] = repository.split('/');

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Gold':
        return TIER_COLORS.gold;
      case 'Silver':
        return TIER_COLORS.silver;
      case 'Bronze':
        return TIER_COLORS.bronze;
      default:
        return STATUS_COLORS.open;
    }
  };

  const isOpenPR = prDetails.prState === 'OPEN';
  const isClosed = prDetails.prState === 'CLOSED';
  const collateralScore = parseFloat(prDetails.collateralScore || '0');
  const earnedScore = parseFloat(prDetails.earnedScore || '0');
  const predictedUsdPerDay = prDetails.predictedUsdPerDay;

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
            border: '2px solid rgba(255, 255, 255, 0.2)',
            backgroundColor:
              owner === 'opentensor'
                ? '#ffffff'
                : owner === 'bitcoin'
                  ? '#F7931A'
                  : 'transparent',
          }}
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Typography
            variant="h5"
            sx={{
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.3rem',
              fontWeight: 500,
            }}
          >
            #{pullRequestNumber}
          </Typography>
          {(() => {
            const statusColor =
              prDetails.prState === 'CLOSED'
                ? theme.palette.status.closed
                : prDetails.prState === 'MERGED'
                  ? theme.palette.status.merged
                  : theme.palette.status.open;
            return (
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
            );
          })()}
        </Box>
        <Typography
          sx={{
            color: '#ffffff',
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
              color: 'rgba(255, 255, 255, 0.5)',
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
          {prDetails.tier && (
            <Chip
              variant="tier"
              label={prDetails.tier}
              sx={{
                color: getTierColor(prDetails.tier),
                borderColor: getTierColor(prDetails.tier),
              }}
            />
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
                      backgroundColor: 'rgba(30, 30, 30, 0.95)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontFamily: '"JetBrains Mono", monospace',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      maxWidth: 280,
                    },
                  },
                  arrow: {
                    sx: {
                      color: 'rgba(30, 30, 30, 0.95)',
                    },
                  },
                }}
              >
                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
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
                  color: 'rgba(255, 255, 255, 0.6)',
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
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
                      backgroundColor: 'rgba(30, 30, 30, 0.95)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontFamily: '"JetBrains Mono", monospace',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      maxWidth: 240,
                    },
                  },
                  arrow: {
                    sx: {
                      color: 'rgba(30, 30, 30, 0.95)',
                    },
                  },
                }}
              >
                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
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
                    collateralScore > 0
                      ? 'rgba(248, 113, 113, 0.9)'
                      : 'rgba(255, 255, 255, 0.4)',
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
                color: 'rgba(255, 255, 255, 0.5)',
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
                color: isClosed ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
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
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontFamily: '"JetBrains Mono", monospace',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        maxWidth: 280,
                      },
                    },
                    arrow: {
                      sx: {
                        color: 'rgba(30, 30, 30, 0.95)',
                      },
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.95rem',
                      color: alpha(STATUS_COLORS.success, 0.8),
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
