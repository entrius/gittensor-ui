import React, { useState } from 'react';
import {
  Card,
  Typography,
  Box,
  CircularProgress,
  Tooltip,
  Collapse,
  IconButton,
  alpha,
  LinearProgress,
} from '@mui/material';
import {
  InfoOutlined as InfoIcon,
  ExpandMore as ExpandIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import {
  useMinerStats,
  useMinerPRs,
  useGeneralConfig,
  type MinerEvaluation,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const calculateDynamicThreshold = (
  minerStats: MinerEvaluation,
  prScoring: { excessivePrPenaltyThreshold?: number; openPrThresholdTokenScore?: number; maxOpenPrThreshold?: number } | undefined,
): number => {
  const baseThreshold = prScoring?.excessivePrPenaltyThreshold ?? 10;
  const tokenScorePer = prScoring?.openPrThresholdTokenScore ?? 500;
  const maxThreshold = prScoring?.maxOpenPrThreshold ?? 30;

  const currentTierLevel = TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;

  let unlockedTokenScore = 0;
  if (currentTierLevel >= 1) unlockedTokenScore += Number(minerStats.bronzeTokenScore || 0);
  if (currentTierLevel >= 2) unlockedTokenScore += Number(minerStats.silverTokenScore || 0);
  if (currentTierLevel >= 3) unlockedTokenScore += Number(minerStats.goldTokenScore || 0);

  const bonus = Math.floor(unlockedTokenScore / tokenScorePer);
  return Math.min(baseThreshold + bonus, maxThreshold);
};

interface ScoreBreakdownPanelProps {
  githubId: string;
}

interface TierBreakdown {
  name: string;
  color: string;
  score: number;
  tokenScore: number;
  structuralCount: number;
  structuralScore: number;
  leafCount: number;
  leafScore: number;
  collateral: number;
  credibility: number;
  mergedPrs: number;
  totalPrs: number;
  isUnlocked: boolean;
}

const ScoreBreakdownPanel: React.FC<ScoreBreakdownPanelProps> = ({
  githubId,
}) => {
  const { data: minerStats, isLoading } = useMinerStats(githubId);
  const { data: prs } = useMinerPRs(githubId);
  const { data: generalConfig } = useGeneralConfig();
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

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

  const currentTierLevel = TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;
  const openPrThreshold = calculateDynamicThreshold(minerStats, generalConfig?.repositoryPrScoring);

  const baseScore = Number(minerStats.baseTotalScore || 0);
  const credibilityMultiplier = Number(minerStats.credibility || 0);
  const collateralDeduction = Number(minerStats.totalCollateralScore || 0);
  const finalScore = Number(minerStats.totalScore || 0);

  // Tier breakdowns
  const tiers: TierBreakdown[] = [
    {
      name: 'Bronze',
      color: TIER_COLORS.bronze,
      score: Number(minerStats.bronzeScore || 0),
      tokenScore: Number(minerStats.bronzeTokenScore || 0),
      structuralCount: Number(minerStats.bronzeStructuralCount || 0),
      structuralScore: Number(minerStats.bronzeStructuralScore || 0),
      leafCount: Number(minerStats.bronzeLeafCount || 0),
      leafScore: Number(minerStats.bronzeLeafScore || 0),
      collateral: Number(minerStats.bronzeCollateralScore || 0),
      credibility: Number(minerStats.bronzeCredibility || 0),
      mergedPrs: Number(minerStats.bronzeMergedPrs || 0),
      totalPrs: Number(minerStats.bronzeTotalPrs || 0),
      isUnlocked: currentTierLevel >= 1,
    },
    {
      name: 'Silver',
      color: TIER_COLORS.silver,
      score: Number(minerStats.silverScore || 0),
      tokenScore: Number(minerStats.silverTokenScore || 0),
      structuralCount: Number(minerStats.silverStructuralCount || 0),
      structuralScore: Number(minerStats.silverStructuralScore || 0),
      leafCount: Number(minerStats.silverLeafCount || 0),
      leafScore: Number(minerStats.silverLeafScore || 0),
      collateral: Number(minerStats.silverCollateralScore || 0),
      credibility: Number(minerStats.silverCredibility || 0),
      mergedPrs: Number(minerStats.silverMergedPrs || 0),
      totalPrs: Number(minerStats.silverTotalPrs || 0),
      isUnlocked: currentTierLevel >= 2,
    },
    {
      name: 'Gold',
      color: TIER_COLORS.gold,
      score: Number(minerStats.goldScore || 0),
      tokenScore: Number(minerStats.goldTokenScore || 0),
      structuralCount: Number(minerStats.goldStructuralCount || 0),
      structuralScore: Number(minerStats.goldStructuralScore || 0),
      leafCount: Number(minerStats.goldLeafCount || 0),
      leafScore: Number(minerStats.goldLeafScore || 0),
      collateral: Number(minerStats.goldCollateralScore || 0),
      credibility: Number(minerStats.goldCredibility || 0),
      mergedPrs: Number(minerStats.goldMergedPrs || 0),
      totalPrs: Number(minerStats.goldTotalPrs || 0),
      isUnlocked: currentTierLevel >= 3,
    },
  ];

  const tooltipSx = {
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
    arrow: { sx: { color: 'rgba(30, 30, 30, 0.95)' } },
  };

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
      {/* Section title */}
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
        Score Breakdown
      </Typography>

      {/* Score pipeline visualization */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: { xs: 1, md: 0 },
          mb: 3,
          p: 2,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Base Score */}
        <Tooltip
          title="Sum of all merged PR token scores across unlocked tiers"
          arrow
          slotProps={tooltipSx}
        >
          <Box sx={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              Base Score <InfoIcon sx={{ fontSize: '0.75rem' }} />
            </Typography>
            <Typography
              sx={{
                color: '#ffffff',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}
            >
              {baseScore.toFixed(2)}
            </Typography>
          </Box>
        </Tooltip>

        <ArrowIcon
          sx={{
            color: 'rgba(255, 255, 255, 0.2)',
            display: { xs: 'none', md: 'block' },
          }}
        />

        {/* Credibility Multiplier */}
        <Tooltip
          title="Applied per-tier based on merged/total PR ratio. Higher credibility = higher score multiplier."
          arrow
          slotProps={tooltipSx}
        >
          <Box sx={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              Credibility <InfoIcon sx={{ fontSize: '0.75rem' }} />
            </Typography>
            <Typography
              sx={{
                color:
                  credibilityMultiplier >= 0.9
                    ? STATUS_COLORS.success
                    : credibilityMultiplier >= 0.7
                      ? '#a3e635'
                      : '#facc15',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}
            >
              {(credibilityMultiplier * 100).toFixed(1)}%
            </Typography>
          </Box>
        </Tooltip>

        <ArrowIcon
          sx={{
            color: 'rgba(255, 255, 255, 0.2)',
            display: { xs: 'none', md: 'block' },
          }}
        />

        {/* Collateral Deduction */}
        <Tooltip
          title={`Open PRs have collateral deducted. ${Number(minerStats.totalOpenPrs || 0)} open PRs, threshold: ${openPrThreshold}.`}
          arrow
          slotProps={tooltipSx}
        >
          <Box sx={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              Collateral <InfoIcon sx={{ fontSize: '0.75rem' }} />
            </Typography>
            <Typography
              sx={{
                color:
                  collateralDeduction > 0
                    ? 'rgba(248, 113, 113, 0.9)'
                    : 'rgba(255, 255, 255, 0.4)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}
            >
              {collateralDeduction > 0
                ? `-${collateralDeduction.toFixed(2)}`
                : '0.00'}
            </Typography>
          </Box>
        </Tooltip>

        <ArrowIcon
          sx={{
            color: 'rgba(255, 255, 255, 0.2)',
            display: { xs: 'none', md: 'block' },
          }}
        />

        {/* Final Score */}
        <Box
          sx={{
            flex: 1,
            textAlign: 'center',
            p: 1.5,
            borderRadius: 1.5,
            backgroundColor: alpha('#1d37fc', 0.1),
            border: `1px solid ${alpha('#1d37fc', 0.3)}`,
          }}
        >
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              mb: 0.5,
            }}
          >
            Final Score
          </Typography>
          <Typography
            sx={{
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.25rem',
              fontWeight: 700,
            }}
          >
            {finalScore.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Per-tier breakdowns */}
      <Typography
        sx={{
          color: 'rgba(255, 255, 255, 0.5)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          mb: 2,
          fontWeight: 600,
        }}
      >
        Per-Tier Details
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {tiers.map((tier) => {
          const isExpanded = expandedTier === tier.name;
          return (
            <Box
              key={tier.name}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: tier.isUnlocked
                  ? alpha(tier.color, 0.2)
                  : 'rgba(255, 255, 255, 0.06)',
                backgroundColor: tier.isUnlocked
                  ? alpha(tier.color, 0.03)
                  : 'rgba(255, 255, 255, 0.01)',
                opacity: tier.isUnlocked ? 1 : 0.5,
                overflow: 'hidden',
              }}
            >
              {/* Tier header - clickable */}
              <Box
                onClick={() =>
                  setExpandedTier(isExpanded ? null : tier.name)
                }
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: tier.color,
                    }}
                  />
                  <Typography
                    sx={{
                      color: tier.color,
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                  >
                    {tier.name}
                    {!tier.isUnlocked && ' (Locked)'}
                  </Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <Typography
                    sx={{
                      color: '#ffffff',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                  >
                    {tier.score.toFixed(2)}
                  </Typography>
                  <IconButton
                    size="small"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.4)',
                      transform: isExpanded
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <ExpandIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Expanded details */}
              <Collapse in={isExpanded}>
                <Box
                  sx={{
                    p: 2,
                    pt: 0,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  {/* Structural vs Leaf */}
                  <Box>
                    <Typography
                      sx={{
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        mb: 1,
                      }}
                    >
                      Node Scoring
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.75rem',
                            }}
                          >
                            Structural ({tier.structuralCount} nodes)
                          </Typography>
                          <Typography
                            sx={{
                              color: '#ffffff',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {tier.structuralScore.toFixed(2)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            tier.tokenScore > 0
                              ? (tier.structuralScore / tier.tokenScore) * 100
                              : 0
                          }
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: alpha(tier.color, 0.6),
                              borderRadius: 2,
                            },
                          }}
                        />
                      </Box>
                      <Box>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.75rem',
                            }}
                          >
                            Leaf ({tier.leafCount} nodes)
                          </Typography>
                          <Typography
                            sx={{
                              color: '#ffffff',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {tier.leafScore.toFixed(2)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            tier.tokenScore > 0
                              ? (tier.leafScore / tier.tokenScore) * 100
                              : 0
                          }
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: alpha(tier.color, 0.4),
                              borderRadius: 2,
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  {/* PR Stats */}
                  <Box>
                    <Typography
                      sx={{
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        mb: 1,
                      }}
                    >
                      PR Statistics
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {[
                        {
                          label: 'Token Score',
                          val: tier.tokenScore.toFixed(2),
                        },
                        {
                          label: 'Credibility',
                          val: `${(tier.credibility * 100).toFixed(1)}%`,
                        },
                        {
                          label: 'Merged PRs',
                          val: `${tier.mergedPrs} / ${tier.totalPrs}`,
                        },
                        {
                          label: 'Collateral',
                          val:
                            tier.collateral > 0
                              ? `-${tier.collateral.toFixed(2)}`
                              : '0.00',
                          color:
                            tier.collateral > 0
                              ? 'rgba(248, 113, 113, 0.8)'
                              : undefined,
                        },
                      ].map((item) => (
                        <Box
                          key={item.label}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Typography
                            sx={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.75rem',
                            }}
                          >
                            {item.label}
                          </Typography>
                          <Typography
                            sx={{
                              color: item.color || '#ffffff',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {item.val}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
};

export default ScoreBreakdownPanel;
