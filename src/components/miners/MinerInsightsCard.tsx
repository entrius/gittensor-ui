import React, { useMemo } from 'react';
import { Box, Card, Chip, Typography, alpha } from '@mui/material';
import {
  CheckCircle as AchievementIcon,
  ErrorOutline as WarningIcon,
  Lightbulb as TipIcon,
  TrackChanges as ProgressIcon,
} from '@mui/icons-material';
import {
  useGeneralConfig,
  useMinerStats,
  useTierConfigurations,
  type MinerEvaluation,
  type RepositoryPrScoring,
  type TierConfig,
} from '../../api';
import { STATUS_COLORS, TIER_COLORS } from '../../theme';
import {
  calculateDynamicOpenPrThreshold,
  getTierLevel,
  parseNumber,
} from './explorerUtils';

interface MinerInsightsCardProps {
  githubId: string;
}

type InsightType = 'warning' | 'tip' | 'achievement' | 'progress';

interface InsightItem {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  priority: number;
}

const fieldByTier = (
  tierName: string,
  suffix: 'QualifiedUniqueRepos' | 'TokenScore' | 'Credibility',
): keyof MinerEvaluation =>
  `${tierName.toLowerCase()}${suffix}` as keyof MinerEvaluation;

const getNextTierName = (tierLevel: number): 'Bronze' | 'Silver' | 'Gold' => {
  if (tierLevel <= 0) return 'Bronze';
  if (tierLevel === 1) return 'Silver';
  return 'Gold';
};

const getOpenPrInsight = (
  minerStats: MinerEvaluation,
  prScoring: RepositoryPrScoring | undefined,
): InsightItem | null => {
  const threshold = calculateDynamicOpenPrThreshold(minerStats, prScoring);
  const totalOpenPrs = parseNumber(minerStats.totalOpenPrs);
  const gap = threshold - totalOpenPrs;

  if (totalOpenPrs >= threshold) {
    return {
      id: 'open-pr-limit-hit',
      type: 'warning',
      title: 'Open PR limit exceeded',
      description: `You currently have ${totalOpenPrs} open PRs against a threshold of ${threshold}. Merge or close open PRs to reduce collateral and recover score efficiency.`,
      priority: 100,
    };
  }

  if (gap <= 2) {
    return {
      id: 'open-pr-limit-near',
      type: 'warning',
      title: 'Open PR limit approaching',
      description: `You are ${gap} PR${gap === 1 ? '' : 's'} away from your current open-PR threshold (${threshold}). Avoid opening more PRs until recent ones merge.`,
      priority: 85,
    };
  }

  return null;
};

const getCredibilityInsight = (minerStats: MinerEvaluation): InsightItem => {
  const credibility = parseNumber(minerStats.credibility);
  const credibilityPercent = (credibility * 100).toFixed(1);
  const totalPrs = parseNumber(minerStats.totalPrs);

  if (credibility >= 0.9 && totalPrs >= 10) {
    return {
      id: 'credibility-excellent',
      type: 'achievement',
      title: 'Excellent credibility',
      description: `Your merge credibility is ${credibilityPercent}% across ${totalPrs} PRs. Keep this consistency to maximize multiplier impact.`,
      priority: 50,
    };
  }

  if (credibility < 0.6 && totalPrs >= 5) {
    return {
      id: 'credibility-needs-work',
      type: 'tip',
      title: 'Improve merge reliability',
      description: `Credibility is currently ${credibilityPercent}%. Focus on narrower PR scope, complete tests, and clear issue linkage to raise your merge rate.`,
      priority: 70,
    };
  }

  return {
    id: 'credibility-stable',
    type: 'tip',
    title: 'Keep credibility trending upward',
    description: `Credibility is ${credibilityPercent}%. Prioritize high-confidence PRs to move toward the top credibility band.`,
    priority: 35,
  };
};

const getTierProgressInsight = (
  minerStats: MinerEvaluation,
  tierConfigList: TierConfig[] | undefined,
): InsightItem => {
  const currentTierLevel = getTierLevel(minerStats.currentTier);

  if (currentTierLevel >= 3) {
    return {
      id: 'tier-maxed',
      type: 'achievement',
      title: 'Top tier unlocked',
      description:
        'You are currently in Gold. Keep credibility and merge consistency high to preserve payout quality.',
      priority: 40,
    };
  }

  const nextTierName = getNextTierName(currentTierLevel);
  const nextTierConfig = tierConfigList?.find(
    (tierConfig) =>
      tierConfig.name.toLowerCase() === nextTierName.toLowerCase(),
  );

  const qualifiedRepos = parseNumber(
    minerStats[fieldByTier(nextTierName, 'QualifiedUniqueRepos')],
  );
  const tierTokenScore = parseNumber(
    minerStats[fieldByTier(nextTierName, 'TokenScore')],
  );
  const tierCredibility = parseNumber(
    minerStats[fieldByTier(nextTierName, 'Credibility')],
  );

  const requiredRepos = parseNumber(
    nextTierConfig?.requiredQualifiedUniqueRepos,
    3,
  );
  const requiredToken = parseNumber(nextTierConfig?.requiredMinTokenScore, 0);
  const requiredCredibility = parseNumber(
    nextTierConfig?.requiredCredibility,
    0.7,
  );

  const missingRepos = Math.max(requiredRepos - qualifiedRepos, 0);
  const missingToken = Math.max(requiredToken - tierTokenScore, 0);
  const missingCredibility = Math.max(requiredCredibility - tierCredibility, 0);

  return {
    id: `tier-progress-${nextTierName.toLowerCase()}`,
    type: 'progress',
    title: `Unlock ${nextTierName}`,
    description: `Need ${missingRepos} more qualified repo${missingRepos === 1 ? '' : 's'}, ${missingToken.toFixed(2)} token score, and ${(missingCredibility * 100).toFixed(1)}% credibility in ${nextTierName} scope.`,
    priority: 90,
  };
};

const getCollateralInsight = (
  minerStats: MinerEvaluation,
): InsightItem | null => {
  const collateralScore = parseNumber(minerStats.totalCollateralScore);
  if (collateralScore <= 0) return null;

  return {
    id: 'collateral-impact',
    type: 'warning',
    title: 'Collateral is suppressing score',
    description: `Current open-PR collateral impact is ${collateralScore.toFixed(2)} score points. Closing stale or risky open PRs can recover effective score.`,
    priority: 75,
  };
};

const getInsightStyle = (type: InsightType) => {
  switch (type) {
    case 'warning':
      return {
        color: STATUS_COLORS.warningOrange,
        border: alpha(STATUS_COLORS.warningOrange, 0.3),
        background: alpha(STATUS_COLORS.warningOrange, 0.09),
        icon: <WarningIcon sx={{ fontSize: '1rem' }} />,
      };
    case 'achievement':
      return {
        color: STATUS_COLORS.success,
        border: alpha(STATUS_COLORS.success, 0.35),
        background: alpha(STATUS_COLORS.success, 0.1),
        icon: <AchievementIcon sx={{ fontSize: '1rem' }} />,
      };
    case 'progress':
      return {
        color: TIER_COLORS.gold,
        border: alpha(TIER_COLORS.gold, 0.35),
        background: alpha(TIER_COLORS.gold, 0.1),
        icon: <ProgressIcon sx={{ fontSize: '1rem' }} />,
      };
    default:
      return {
        color: STATUS_COLORS.info,
        border: alpha(STATUS_COLORS.info, 0.35),
        background: alpha(STATUS_COLORS.info, 0.1),
        icon: <TipIcon sx={{ fontSize: '1rem' }} />,
      };
  }
};

const MinerInsightsCard: React.FC<MinerInsightsCardProps> = ({ githubId }) => {
  const { data: minerStats } = useMinerStats(githubId);
  const { data: generalConfig } = useGeneralConfig();
  const { data: tierConfigData } = useTierConfigurations();

  const insights = useMemo(() => {
    if (!minerStats) return [];

    const assembled: InsightItem[] = [];

    const openPrInsight = getOpenPrInsight(
      minerStats,
      generalConfig?.repositoryPrScoring,
    );
    if (openPrInsight) assembled.push(openPrInsight);

    const collateralInsight = getCollateralInsight(minerStats);
    if (collateralInsight) assembled.push(collateralInsight);

    assembled.push(getTierProgressInsight(minerStats, tierConfigData?.tiers));
    assembled.push(getCredibilityInsight(minerStats));

    return assembled.sort((a, b) => b.priority - a.priority).slice(0, 4);
  }, [minerStats, generalConfig, tierConfigData]);

  if (!minerStats) return null;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        p: 3,
      }}
      elevation={0}
    >
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            color: 'text.primary',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '1.1rem',
            fontWeight: 600,
            mb: 0.8,
          }}
        >
          Insights & Next Actions
        </Typography>
        <Typography
          sx={{
            color: (t) => alpha(t.palette.text.primary, 0.55),
            fontSize: '0.85rem',
          }}
        >
          Prioritized recommendations based on your tier progress, credibility,
          collateral, and open-PR posture.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
        {insights.map((insight) => {
          const style = getInsightStyle(insight.type);
          return (
            <Box
              key={insight.id}
              sx={{
                borderRadius: 1.7,
                px: 1.5,
                py: 1.2,
                border: `1px solid ${style.border}`,
                backgroundColor: style.background,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.1,
              }}
            >
              <Box sx={{ color: style.color, mt: 0.15 }}>{style.icon}</Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  sx={{
                    color: style.color,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.83rem',
                    fontWeight: 600,
                  }}
                >
                  {insight.title}
                </Typography>
                <Typography
                  sx={{
                    color: (t) => alpha(t.palette.text.primary, 0.68),
                    fontSize: '0.8rem',
                    mt: 0.4,
                    lineHeight: 1.45,
                  }}
                >
                  {insight.description}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={insight.type}
                sx={{
                  textTransform: 'uppercase',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.62rem',
                  color: style.color,
                  backgroundColor: alpha(style.color, 0.12),
                  border: `1px solid ${alpha(style.color, 0.35)}`,
                  height: 22,
                }}
              />
            </Box>
          );
        })}
      </Box>

      <Typography
        sx={{
          mt: 2,
          textAlign: 'right',
          fontSize: '0.72rem',
          fontFamily: '"JetBrains Mono", monospace',
          color: (t) => alpha(t.palette.text.primary, 0.35),
        }}
      >
        Learn more about scoring in the{' '}
        <Typography
          component="a"
          href="https://docs.gittensor.io/oss-contributions.html"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: 'primary.main',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          docs
        </Typography>
      </Typography>
    </Card>
  );
};

export default MinerInsightsCard;
