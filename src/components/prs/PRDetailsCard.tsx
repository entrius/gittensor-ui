import React from 'react';
import {
  Card,
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Grid,
  alpha,
  Tooltip,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { usePullRequestDetails } from '../../api';
import { useNavigate } from 'react-router-dom';
import theme, { RANK_COLORS, STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import { buildMultiplierGrid } from '../../utils/multiplierDefs';

interface PRDetailsCardProps {
  repository: string;
  pullRequestNumber: number;
  hideHeader?: boolean;
}

const PRDetailsCard: React.FC<PRDetailsCardProps> = ({
  repository,
  pullRequestNumber,
  hideHeader = false,
}) => {
  const navigate = useNavigate();
  // Fetch detailed PR data directly
  const { data: prDetails, isLoading: isDetailsLoading } =
    usePullRequestDetails(repository, pullRequestNumber);

  if (isDetailsLoading) {
    return (
      <Card
        sx={{
          backgroundColor: alpha(theme.palette.common.white, 0.02),
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'border.subtle',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (!prDetails) {
    return (
      <Card
        sx={{
          backgroundColor: alpha(theme.palette.common.white, 0.02),
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'border.subtle',
          p: 4,
        }}
      >
        <Typography
          sx={{
            color: alpha(STATUS_COLORS.error, 0.9),
            fontSize: '0.9rem',
          }}
        >
          Pull request not found.
        </Typography>
      </Card>
    );
  }

  const [owner] = repository.split('/');

  const isOpenPR = prDetails.prState === 'OPEN';

  // Score/Collateral is now shown in header, so only show other stats here
  const statItems = [
    {
      label: 'Base Score',
      value: parseFloat(prDetails.baseScore ?? '0').toFixed(2),
      rank: null,
      color: alpha(theme.palette.common.white, TEXT_OPACITY.secondary),
    },
    {
      label: 'Tokens Scored',
      value: (prDetails.totalNodesScored ?? 0).toLocaleString(),
      rank: null,
    },
    {
      label: 'Token Score',
      value: parseFloat(prDetails.tokenScore ?? '0').toFixed(2),
      rank: null,
    },
    {
      label: 'Structural',
      value:
        prDetails.structuralCount != null
          ? `${prDetails.structuralCount} (${parseFloat(String(prDetails.structuralScore ?? 0)).toFixed(2)})`
          : '-',
      rank: null,
      tooltip:
        'Functions, classes, and modules scored via AST analysis. Structural nodes carry more weight per node because they represent high-value code organization.',
    },
    {
      label: 'Leaf',
      value:
        prDetails.leafCount != null
          ? `${prDetails.leafCount} (${parseFloat(String(prDetails.leafScore ?? 0)).toFixed(2)})`
          : '-',
      rank: null,
      tooltip:
        'Individual statements and expressions scored via AST analysis. More leaf nodes means a larger diff, but structural nodes contribute more score per node.',
    },
    {
      label: 'Changes',
      value: '',
      rank: null,
      additions: prDetails.additions,
      deletions: prDetails.deletions,
    },
    {
      label: 'Commits',
      value: prDetails.commits,
      rank: null,
    },
  ];

  const multipliers = buildMultiplierGrid(prDetails, isOpenPR);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: 'transparent',
        p: 3,
      }}
      elevation={0}
    >
      {/* PR Header */}
      {!hideHeader && (
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
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
                border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                backgroundColor:
                  owner === 'opentensor'
                    ? theme.palette.common.white
                    : owner === 'bitcoin'
                      ? '#F7931A'
                      : 'transparent',
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}
            >
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
                    {
                      state: { backLabel: `Back to PR #${pullRequestNumber}` },
                    },
                  )
                }
                sx={{
                  color: alpha(
                    theme.palette.common.white,
                    TEXT_OPACITY.tertiary,
                  ),
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
        </Box>
      )}

      {/* Stats Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <Box
              sx={{
                backgroundColor: 'transparent',
                borderRadius: 3,
                border: `1px solid ${theme.palette.border.light}`,
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                }}
              >
                <Typography
                  sx={{
                    color: alpha(
                      theme.palette.common.white,
                      TEXT_OPACITY.tertiary,
                    ),
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  {item.label}
                  {item.tooltip && (
                    <Tooltip
                      title={item.tooltip}
                      arrow
                      slotProps={{
                        tooltip: {
                          sx: {
                            backgroundColor: 'surface.tooltip',
                            color: 'text.primary',
                            fontSize: '0.7rem',
                            maxWidth: 280,
                            p: 1.5,
                            border: '1px solid',
                            borderColor: 'border.light',
                          },
                        },
                        arrow: { sx: { color: 'surface.tooltip' } },
                      }}
                    >
                      <InfoOutlinedIcon
                        sx={{
                          fontSize: '0.7rem',
                          cursor: 'help',
                          opacity: 0.5,
                        }}
                      />
                    </Tooltip>
                  )}
                </Typography>
                {item.rank && (
                  <Box
                    sx={{
                      backgroundColor: 'background.default',
                      borderRadius: '2px',
                      width: '20px',
                      height: '20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid',
                      borderColor:
                        item.rank === 1
                          ? alpha(RANK_COLORS.first, 0.4)
                          : item.rank === 2
                            ? alpha(RANK_COLORS.second, 0.4)
                            : item.rank === 3
                              ? alpha(RANK_COLORS.third, 0.4)
                              : alpha(theme.palette.common.white, 0.15),
                      boxShadow:
                        item.rank === 1
                          ? `0 0 12px ${alpha(RANK_COLORS.first, 0.4)}, 0 0 4px ${alpha(RANK_COLORS.first, 0.2)}`
                          : item.rank === 2
                            ? `0 0 12px ${alpha(RANK_COLORS.second, 0.4)}, 0 0 4px ${alpha(RANK_COLORS.second, 0.2)}`
                            : item.rank === 3
                              ? `0 0 12px ${alpha(RANK_COLORS.third, 0.4)}, 0 0 4px ${alpha(RANK_COLORS.third, 0.2)}`
                              : 'none',
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        color:
                          item.rank === 1
                            ? RANK_COLORS.first
                            : item.rank === 2
                              ? RANK_COLORS.second
                              : item.rank === 3
                                ? RANK_COLORS.third
                                : alpha(theme.palette.common.white, 0.6),
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.rank}
                    </Typography>
                  </Box>
                )}
              </Box>
              {item.additions !== undefined && item.deletions !== undefined ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    component="span"
                    sx={{
                      color: alpha(theme.palette.diff.additions, 0.8),
                      fontSize: '1.5rem',
                      fontWeight: 600,
                    }}
                  >
                    +{item.additions}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      color: alpha(
                        theme.palette.common.white,
                        TEXT_OPACITY.muted,
                      ),
                      fontSize: '1.5rem',
                      fontWeight: 400,
                    }}
                  >
                    /
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      color: alpha(theme.palette.diff.deletions, 0.8),
                      fontSize: '1.5rem',
                      fontWeight: 600,
                    }}
                  >
                    -{item.deletions}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  sx={{
                    color: item.color || theme.palette.text.primary,
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    wordBreak: 'break-all',
                  }}
                >
                  {item.value}
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Multipliers Breakdown */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            color: alpha(theme.palette.common.white, TEXT_OPACITY.secondary),
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontWeight: 600,
            mb: 2,
          }}
        >
          {isOpenPR ? 'Collateral Multipliers' : 'Score Multipliers'}
        </Typography>
        <Grid container spacing={2}>
          {multipliers.map((item, index) => {
            const isCredibilityItem = item.isCredibility === true;

            const content = (
              <Box
                sx={{
                  backgroundColor: alpha(theme.palette.common.white, 0.03),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: isCredibilityItem ? 'help' : 'default',
                }}
              >
                <Typography
                  sx={{
                    color: alpha(
                      theme.palette.common.white,
                      TEXT_OPACITY.tertiary,
                    ),
                    fontSize: '0.7rem',
                    mb: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  {item.label}
                  {isCredibilityItem && (
                    <InfoOutlinedIcon sx={{ fontSize: '0.7rem' }} />
                  )}
                </Typography>
                <Typography
                  sx={{
                    color: 'text.primary',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {item.value}
                </Typography>
              </Box>
            );

            return (
              <Grid item xs={6} sm={4} md={2} key={index}>
                {isCredibilityItem ? (
                  <Tooltip
                    title={
                      <Box sx={{ p: 0.5 }}>
                        <Typography
                          sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1 }}
                        >
                          Credibility Multiplier
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            color: alpha(theme.palette.common.white, 0.9),
                          }}
                        >
                          This multiplier is based on your PR success rate,
                          scaled to reward consistency.
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement="top"
                    slotProps={{
                      tooltip: {
                        sx: {
                          backgroundColor: 'surface.tooltip',
                          border: `1px solid ${alpha(theme.palette.common.white, 0.15)}`,
                          borderRadius: '8px',
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
                    {content}
                  </Tooltip>
                ) : (
                  content
                )}
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Additional Info */}
      <Grid container spacing={2}>
        {/* Author */}
        <Grid item xs={12} sm={6}>
          <Box
            sx={{
              backgroundColor: 'transparent',
              borderRadius: 3,
              border: `1px solid ${theme.palette.border.light}`,
              p: 2.5,
              height: '100%',
            }}
          >
            <Typography
              sx={{
                color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600,
                mb: 1.5,
              }}
            >
              Author
            </Typography>
            <Box
              onClick={() =>
                navigate(`/miners/details?githubId=${prDetails.githubId}`, {
                  state: { backLabel: `Back to PR #${pullRequestNumber}` },
                })
              }
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                '&:hover': {
                  '& .MuiTypography-root': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                  },
                },
                transition: 'color 0.2s',
              }}
            >
              <Avatar
                src={`https://avatars.githubusercontent.com/${prDetails.authorLogin}`}
                alt={prDetails.authorLogin}
                sx={{ width: 32, height: 32 }}
              />
              <Typography
                sx={{
                  color: 'text.primary',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
              >
                {prDetails.authorLogin}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Merged Date */}
        <Grid item xs={12} sm={6}>
          <Box
            sx={{
              backgroundColor: 'transparent',
              borderRadius: 3,
              border: `1px solid ${theme.palette.border.light}`,
              p: 2.5,
              height: '100%',
            }}
          >
            <Typography
              sx={{
                color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600,
                mb: 1.5,
              }}
            >
              Merged
            </Typography>
            <Typography
              sx={{
                color: 'text.primary',
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            >
              {prDetails.mergedAt
                ? new Date(prDetails.mergedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Not Merged'}
            </Typography>
          </Box>
        </Grid>

        {/* Hotkey */}
        {prDetails.hotkey && (
          <Grid item xs={12}>
            <Box
              sx={{
                backgroundColor: 'transparent',
                borderRadius: 3,
                border: `1px solid ${theme.palette.border.light}`,
                p: 2.5,
              }}
            >
              <Typography
                sx={{
                  color: alpha(
                    theme.palette.common.white,
                    TEXT_OPACITY.tertiary,
                  ),
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 600,
                  mb: 1.5,
                }}
              >
                Hotkey
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  wordBreak: 'break-all',
                }}
              >
                {prDetails.hotkey}
              </Typography>
            </Box>
          </Grid>
        )}

        {/* GitHub Link */}
        <Grid item xs={12}>
          <Box
            sx={{
              backgroundColor: 'transparent',
              borderRadius: 3,
              border: `1px solid ${theme.palette.border.light}`,
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              sx={{
                color: alpha(
                  theme.palette.common.white,
                  TEXT_OPACITY.secondary,
                ),
                fontSize: '0.85rem',
              }}
            >
              View this pull request on GitHub
            </Typography>
            <a
              href={`https://github.com/${repository}/pull/${pullRequestNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: STATUS_COLORS.info,
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
            >
              Open →
            </a>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
};

export default PRDetailsCard;
