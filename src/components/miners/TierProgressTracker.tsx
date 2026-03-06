import React from 'react';
import {
  Card,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
  Chip,
  alpha,
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as UnlockedIcon,
  Star as StarIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import {
  useMinerStats,
  useTierConfigurations,
  type TierConfig,
} from '../../api';
import { TIER_COLORS } from '../../theme';

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

interface TierProgressTrackerProps {
  githubId: string;
}

interface TierRequirement {
  label: string;
  current: number;
  required: number;
  format: (v: number) => string;
}

const TierProgressTracker: React.FC<TierProgressTrackerProps> = ({
  githubId,
}) => {
  const { data: minerStats, isLoading } = useMinerStats(githubId);
  const { data: tierConfigData } = useTierConfigurations();

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <CircularProgress size={30} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (!minerStats) return null;

  const tierConfigs = tierConfigData?.tiers;
  const currentTierLevel =
    TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;

  const getConfig = (name: string): TierConfig | undefined =>
    tierConfigs?.find((t) => t.name.toLowerCase() === name.toLowerCase());

  const tiers = [
    {
      name: 'Bronze',
      level: 1,
      color: TIER_COLORS.bronze,
      stats: {
        tokenScore: Number(minerStats.bronzeTokenScore || 0),
        qualifiedRepos: Number(minerStats.bronzeQualifiedUniqueRepos || 0),
        credibility: Number(minerStats.bronzeCredibility || 0),
        score: Number(minerStats.bronzeScore || 0),
        mergedPrs: Number(minerStats.bronzeMergedPrs || 0),
      },
    },
    {
      name: 'Silver',
      level: 2,
      color: TIER_COLORS.silver,
      stats: {
        tokenScore: Number(minerStats.silverTokenScore || 0),
        qualifiedRepos: Number(minerStats.silverQualifiedUniqueRepos || 0),
        credibility: Number(minerStats.silverCredibility || 0),
        score: Number(minerStats.silverScore || 0),
        mergedPrs: Number(minerStats.silverMergedPrs || 0),
      },
    },
    {
      name: 'Gold',
      level: 3,
      color: TIER_COLORS.gold,
      stats: {
        tokenScore: Number(minerStats.goldTokenScore || 0),
        qualifiedRepos: Number(minerStats.goldQualifiedUniqueRepos || 0),
        credibility: Number(minerStats.goldCredibility || 0),
        score: Number(minerStats.goldScore || 0),
        mergedPrs: Number(minerStats.goldMergedPrs || 0),
      },
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
      <Typography
        variant="h6"
        sx={{
          color: '#ffffff',
          fontFamily: '"JetBrains Mono", monospace',
          mb: 3,
          fontWeight: 600,
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          '&::before': {
            content: '""',
            width: '4px',
            height: '20px',
            backgroundColor: 'primary.main',
            borderRadius: '2px',
          },
        }}
      >
        Tier Progress
      </Typography>

      {/* Tier ladder visualization */}
      <Box sx={{ position: 'relative' }}>
        {tiers.map((tier, index) => {
          const isUnlocked = tier.level <= currentTierLevel;
          const isCurrentTier =
            tier.name.toLowerCase() ===
            (minerStats.currentTier || '').toLowerCase();
          const isNextTier = tier.level === currentTierLevel + 1;
          const config = getConfig(tier.name);

          // Build requirements for this tier
          const requirements: TierRequirement[] = [];
          if (config) {
            requirements.push({
              label: 'Qualified Repos',
              current: tier.stats.qualifiedRepos,
              required: config.requiredQualifiedUniqueRepos,
              format: (v) => String(v),
            });
            requirements.push({
              label: 'Credibility',
              current: tier.stats.credibility,
              required: config.requiredCredibility,
              format: (v) => `${(v * 100).toFixed(0)}%`,
            });
            if (config.requiredMinTokenScore) {
              requirements.push({
                label: 'Token Score',
                current: tier.stats.tokenScore,
                required: config.requiredMinTokenScore,
                format: (v) => v.toFixed(0),
              });
            }
          }

          const allRequirementsMet = requirements.every(
            (r) => r.current >= r.required,
          );

          return (
            <Box key={tier.name}>
              {/* Connecting line between tiers */}
              {index > 0 && (
                <Box
                  sx={{
                    width: 2,
                    height: 24,
                    ml: '19px',
                    backgroundColor:
                      tier.level <= currentTierLevel
                        ? alpha(tier.color, 0.4)
                        : 'rgba(255, 255, 255, 0.08)',
                  }}
                />
              )}

              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: isCurrentTier
                    ? alpha(tier.color, 0.4)
                    : isUnlocked
                      ? alpha(tier.color, 0.15)
                      : 'rgba(255, 255, 255, 0.06)',
                  backgroundColor: isCurrentTier
                    ? alpha(tier.color, 0.05)
                    : 'transparent',
                  opacity: !isUnlocked && !isNextTier ? 0.5 : 1,
                  position: 'relative',
                }}
              >
                {/* Tier indicator circle */}
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: isUnlocked
                      ? tier.color
                      : 'rgba(255, 255, 255, 0.15)',
                    backgroundColor: isUnlocked
                      ? alpha(tier.color, 0.15)
                      : 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isCurrentTier
                      ? `0 0 16px ${alpha(tier.color, 0.3)}`
                      : 'none',
                  }}
                >
                  {isUnlocked ? (
                    isCurrentTier ? (
                      <StarIcon
                        sx={{ fontSize: '1.2rem', color: tier.color }}
                      />
                    ) : (
                      <CheckIcon
                        sx={{ fontSize: '1.2rem', color: tier.color }}
                      />
                    )
                  ) : (
                    <LockIcon
                      sx={{
                        fontSize: '1rem',
                        color: 'rgba(255, 255, 255, 0.3)',
                      }}
                    />
                  )}
                </Box>

                {/* Tier content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          color: tier.color,
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '1rem',
                          fontWeight: 700,
                        }}
                      >
                        {tier.name}
                      </Typography>
                      {isCurrentTier && (
                        <Chip
                          label="CURRENT"
                          size="small"
                          sx={{
                            height: 20,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            color: tier.color,
                            backgroundColor: alpha(tier.color, 0.15),
                            border: `1px solid ${alpha(tier.color, 0.3)}`,
                          }}
                        />
                      )}
                      {isUnlocked && !isCurrentTier && (
                        <Chip
                          label="UNLOCKED"
                          size="small"
                          icon={
                            <UnlockedIcon
                              sx={{
                                fontSize: '0.7rem',
                                color: `${tier.color} !important`,
                              }}
                            />
                          }
                          sx={{
                            height: 20,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.6rem',
                            color: tier.color,
                            backgroundColor: alpha(tier.color, 0.1),
                            border: `1px solid ${alpha(tier.color, 0.2)}`,
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      sx={{
                        color: '#ffffff',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                      }}
                    >
                      {tier.stats.score.toFixed(2)} pts
                    </Typography>
                  </Box>

                  {/* Requirements progress bars */}
                  {(isNextTier || isCurrentTier) &&
                    requirements.length > 0 && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                        }}
                      >
                        {requirements.map((req) => {
                          const progress = Math.min(
                            (req.current / req.required) * 100,
                            100,
                          );
                          const isMet = req.current >= req.required;

                          return (
                            <Box key={req.label}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  mb: 0.25,
                                }}
                              >
                                <Typography
                                  sx={{
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontFamily:
                                      '"JetBrains Mono", monospace',
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {req.label}
                                </Typography>
                                <Typography
                                  sx={{
                                    color: isMet
                                      ? alpha(tier.color, 0.9)
                                      : 'rgba(255, 255, 255, 0.6)',
                                    fontFamily:
                                      '"JetBrains Mono", monospace',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  {req.format(req.current)} /{' '}
                                  {req.format(req.required)}
                                  {isMet && ' \u2713'}
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={progress}
                                sx={{
                                  height: 4,
                                  borderRadius: 2,
                                  backgroundColor:
                                    'rgba(255, 255, 255, 0.06)',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: isMet
                                      ? tier.color
                                      : alpha(tier.color, 0.5),
                                    borderRadius: 2,
                                  },
                                }}
                              />
                            </Box>
                          );
                        })}
                      </Box>
                    )}

                  {/* Celebration state for fully unlocked */}
                  {isUnlocked && allRequirementsMet && !isCurrentTier && (
                    <Typography
                      sx={{
                        color: alpha(tier.color, 0.7),
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.75rem',
                        fontStyle: 'italic',
                      }}
                    >
                      All requirements met - {tier.stats.mergedPrs} merged
                      PRs
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
};

export default TierProgressTracker;
