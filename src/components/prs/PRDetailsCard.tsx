import React from 'react';
import {
  Card,
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Grid,
  Chip,
  alpha,
} from '@mui/material';
import { usePullRequestDetails } from '../../api';
import { useNavigate } from 'react-router-dom';
import theme from '../../theme';

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
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          p: 4,
        }}
      >
        <Typography
          sx={{
            color: 'rgba(255, 107, 107, 0.9)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
          }}
        >
          Pull request not found.
        </Typography>
      </Card>
    );
  }

  const [owner] = repository.split('/');

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Gold':
        return '#FFD700';
      case 'Silver':
        return '#C0C0C0';
      case 'Bronze':
        return '#CD7F32';
      default:
        return '#8b949e';
    }
  };

  const isOpenPR = prDetails.prState === 'OPEN';

  // Score/Collateral is now shown in header, so only show other stats here
  const statItems = [
    {
      label: 'Base Score',
      value: parseFloat(prDetails.baseScore ?? '0').toFixed(2),
      rank: null,
      color: 'rgba(255, 255, 255, 0.7)',
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

  // For OPEN PRs: collateral = base_score × repo_weight × issue_multiplier × 20%
  // Only show applicable multipliers
  const multipliers: Array<{
    label: string;
    value: string;
  }> = isOpenPR
    ? [
        {
          label: 'Repo Weight',
          value: `${parseFloat(prDetails.repoWeightMultiplier ?? '0').toFixed(2)}x`,
        },
        {
          label: 'Issue Bonus',
          value: `${parseFloat(prDetails.issueMultiplier ?? '0').toFixed(2)}x`,
        },
        {
          label: 'Collateral %',
          value: '20%',
        },
      ]
    : [
        {
          label: 'Repo Weight',
          value: `${parseFloat(prDetails.repoWeightMultiplier ?? '0').toFixed(2)}x`,
        },
        {
          label: 'Issue Bonus',
          value: `${parseFloat(prDetails.issueMultiplier ?? '0').toFixed(2)}x`,
        },
        {
          label: 'Credibility*',
          value: `${parseFloat(prDetails.credibilityMultiplier ?? '0').toFixed(2)}x`,
        },
        {
          label: 'Repo Unique',
          value: `${parseFloat(prDetails.repositoryUniquenessMultiplier ?? '0').toFixed(2)}x`,
        },
        {
          label: 'Time Decay',
          value: `${parseFloat(prDetails.timeDecayMultiplier ?? '0').toFixed(2)}x`,
        },
      ];

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
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
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}
            >
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
                border: '1px solid rgba(255, 255, 255, 0.1)',
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
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </Typography>
                {item.rank && (
                  <Box
                    sx={{
                      backgroundColor: '#000000',
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
                          ? 'rgba(255, 215, 0, 0.4)'
                          : item.rank === 2
                            ? 'rgba(192, 192, 192, 0.4)'
                            : item.rank === 3
                              ? 'rgba(205, 127, 50, 0.4)'
                              : 'rgba(255, 255, 255, 0.15)',
                      boxShadow:
                        item.rank === 1
                          ? '0 0 12px rgba(255, 215, 0, 0.4), 0 0 4px rgba(255, 215, 0, 0.2)'
                          : item.rank === 2
                            ? '0 0 12px rgba(192, 192, 192, 0.4), 0 0 4px rgba(192, 192, 192, 0.2)'
                            : item.rank === 3
                              ? '0 0 12px rgba(205, 127, 50, 0.4), 0 0 4px rgba(205, 127, 50, 0.2)'
                              : 'none',
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        color:
                          item.rank === 1
                            ? '#FFD700'
                            : item.rank === 2
                              ? '#C0C0C0'
                              : item.rank === 3
                                ? '#CD7F32'
                                : 'rgba(255, 255, 255, 0.6)',
                        fontFamily: '"JetBrains Mono", monospace',
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
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                    }}
                  >
                    +{item.additions}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontFamily: '"JetBrains Mono", monospace',
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
                      fontFamily: '"JetBrains Mono", monospace',
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
                    color: item.color || '#ffffff',
                    fontFamily: '"JetBrains Mono", monospace',
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
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: '"JetBrains Mono", monospace',
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
          {multipliers.map((item, index) => (
            <Grid item xs={6} sm={4} md={2} key={index}>
              <Box
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.7rem',
                    mb: 0.5,
                  }}
                >
                  {item.label}
                </Typography>
                <Typography
                  sx={{
                    color: '#ffffff',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {item.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        {!isOpenPR && (
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.35)',
              fontSize: '0.65rem',
              fontStyle: 'italic',
              mt: 1.5,
              textAlign: 'center',
            }}
          >
            *Credibility has been exponentially scaled by the tier scalar
          </Typography>
        )}
      </Box>

      {/* Additional Info */}
      <Grid container spacing={2}>
        {/* Author */}
        <Grid item xs={12} sm={6}>
          <Box
            sx={{
              backgroundColor: 'transparent',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              p: 2.5,
              height: '100%',
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
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
                navigate(`/miners/details?githubId=${prDetails.githubId}`)
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
                  color: '#ffffff',
                  fontFamily: '"JetBrains Mono", monospace',
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
              border: '1px solid rgba(255, 255, 255, 0.1)',
              p: 2.5,
              height: '100%',
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
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
                color: '#ffffff',
                fontFamily: '"JetBrains Mono", monospace',
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
                border: '1px solid rgba(255, 255, 255, 0.1)',
                p: 2.5,
              }}
            >
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: '"JetBrains Mono", monospace',
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
                  fontFamily: '"JetBrains Mono", monospace',
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
              border: '1px solid rgba(255, 255, 255, 0.1)',
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontFamily: '"JetBrains Mono", monospace',
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
                color: '#58a6ff',
                textDecoration: 'none',
                fontFamily: '"JetBrains Mono", monospace',
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
