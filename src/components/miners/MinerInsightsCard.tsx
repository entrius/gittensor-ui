import React, { useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  TrendingUp as GrowthIcon,
  Star as StarIcon,
  ArrowUpward as NextStepIcon,
  Lightbulb as TipIcon,
} from '@mui/icons-material';
import { useMinerStats, useGeneralConfig } from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const calculateDynamicThreshold = (
  minerStats: any,
  prScoring: any,
): number => {
  const baseThreshold = prScoring?.excessivePrPenaltyThreshold ?? 10;
  const tokenScorePer = prScoring?.openPrThresholdTokenScore ?? 500;
  const maxThreshold = prScoring?.maxOpenPrThreshold ?? 30;

  const currentTierLevel =
    TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;

  let unlockedTokenScore = 0;
  if (currentTierLevel >= 1)
    unlockedTokenScore += Number(minerStats.bronzeTokenScore || 0);
  if (currentTierLevel >= 2)
    unlockedTokenScore += Number(minerStats.silverTokenScore || 0);
  if (currentTierLevel >= 3)
    unlockedTokenScore += Number(minerStats.goldTokenScore || 0);

  const bonus = Math.floor(unlockedTokenScore / tokenScorePer);
  return Math.min(baseThreshold + bonus, maxThreshold);
};

interface MinerInsightsCardProps {
  githubId: string;
}

const MinerInsightsCard: React.FC<MinerInsightsCardProps> = ({ githubId }) => {
  const { data: minerStats } = useMinerStats(githubId);
  const { data: generalConfig } = useGeneralConfig();

  if (!minerStats) return null;

  const insights = useMemo(() => {
    const items: Array<{
      type: 'achievement' | 'warning' | 'tip' | 'next-step';
      icon: React.ReactNode;
      title: string;
      description: string;
      priority: number;
    }> = [];

    const openPrThreshold = calculateDynamicThreshold(
      minerStats,
      generalConfig?.repositoryPrScoring,
    );
    const openPrs = Number(minerStats.totalOpenPrs || 0);
    const credibility = Number(minerStats.credibility || 0);
    const currentTierLevel =
      TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;

    // Warnings: High Risk
    if (openPrs >= openPrThreshold) {
      items.push({
        type: 'warning',
        icon: <WarningIcon />,
        title: 'High Risk: Exceeded Open PR Limit',
        description: `You have ${openPrs} open PRs exceeding the threshold of ${openPrThreshold}. This applies full collateral penalties to your score. Merge or close some PRs to recover your earnings.`,
        priority: 3,
      });
    } else if (openPrs >= openPrThreshold - 2) {
      items.push({
        type: 'warning',
        icon: <WarningIcon />,
        title: 'Warning: Approaching Open PR Limit',
        description: `You have ${openPrs} open PRs close to the threshold of ${openPrThreshold}. Continuing to open PRs without merging will incur penalties.`,
        priority: 2,
      });
    }

    // Warnings: Low Credibility
    if (credibility < 0.5 && minerStats.totalPrs > 5) {
      items.push({
        type: 'warning',
        icon: <WarningIcon />,
        title: 'Low Credibility Alert',
        description: `Your credibility is ${(credibility * 100).toFixed(1)}%. Focus on high-quality, well-tested PRs that are likely to merge to improve your success rate.`,
        priority: 2,
      });
    }

    // Achievements
    if (credibility >= 0.9) {
      items.push({
        type: 'achievement',
        icon: <StarIcon />,
        title: 'Excellent Credibility',
        description: `Your ${(credibility * 100).toFixed(1)}% credibility rating shows highly successful contributions. Keep up the quality work!`,
        priority: 1,
      });
    }

    if (minerStats.totalMergedPrs >= 10) {
      items.push({
        type: 'achievement',
        icon: <CheckIcon />,
        title: 'Active Contributor',
        description: `You've successfully merged ${minerStats.totalMergedPrs} PRs! This demonstrates consistent, valuable contributions.`,
        priority: 1,
      });
    }

    // Next Steps: Tier Progression
    if (currentTierLevel < 3) {
      const nextTier = currentTierLevel === 0 ? 'Bronze' : currentTierLevel === 1 ? 'Silver' : 'Gold';
      const tierKey = nextTier.toLowerCase();
      const qualifiedRepos = minerStats[`${tierKey}QualifiedUniqueRepos`] || 0;
      const tokenScore = minerStats[`${tierKey}TokenScore`] || 0;

      items.push({
        type: 'next-step',
        icon: <GrowthIcon />,
        title: `Unlock ${nextTier} Tier`,
        description: `You need ${3 - qualifiedRepos} more qualified ${nextTier} repos${
          qualifiedRepos > 0 ? ` (${qualifiedRepos}/3)` : ''
        }. Focus on contributing to ${nextTier}-tier repositories to unlock higher multipliers.`,
        priority: 3,
      });
    }

    // Tips for Improvement
    if (credibility < 0.8) {
      items.push({
        type: 'tip',
        icon: <TipIcon />,
        title: 'Improve Merge Rate',
        description: 'Review PR comments before submission, ensure tests pass, and provide clear descriptions. Well-prepared PRs have higher merge chances.',
        priority: 1,
      });
    }

    if (minerStats.uniqueReposCount < 3 && minerStats.totalPrs >= 5) {
      items.push({
        type: 'tip',
        icon: <TipIcon />,
        title: 'Diversify Your Repositories',
        description: "Contributing to multiple repos improves your miner profile and reduces dependency risk. Try mentoring PRs in other Gold-tier projects.",
        priority: 1,
      });
    }

    // Earnings Optimization
    if (minerStats.totalCollateralScore > 0) {
      items.push({
        type: 'warning',
        icon: <WarningIcon />,
        title: 'Collateral Impacting Earnings',
        description: `Open PR collateral is reducing your score by ${Number(minerStats.totalCollateralScore).toFixed(2)}. Merging these PRs will restore your earnings.`,
        priority: 2,
      });
    }

    // Sort by priority
    return items.sort((a, b) => b.priority - a.priority);
  }, [minerStats, generalConfig]);

  const InsightItem: React.FC<{
    type: 'achievement' | 'warning' | 'tip' | 'next-step';
    icon: React.ReactNode;
    title: string;
    description: string;
  }> = ({ type, icon, title, description }) => {
    const typeConfig = {
      achievement: {
        color: STATUS_COLORS.success,
        bgColor: alpha(STATUS_COLORS.success, 0.1),
        borderColor: alpha(STATUS_COLORS.success, 0.2),
      },
      warning: {
        color: 'rgba(251, 146, 60, 0.9)',
        bgColor: alpha('rgba(251, 146, 60, 0.9)', 0.1),
        borderColor: alpha('rgba(251, 146, 60, 0.9)', 0.2),
      },
      tip: {
        color: STATUS_COLORS.info,
        bgColor: alpha(STATUS_COLORS.info, 0.1),
        borderColor: alpha(STATUS_COLORS.info, 0.2),
      },
      'next-step': {
        color: TIER_COLORS.gold,
        bgColor: alpha(TIER_COLORS.gold, 0.1),
        borderColor: alpha(TIER_COLORS.gold, 0.2),
      },
    };

    const config = typeConfig[type];

    return (
      <ListItem
        sx={{
          backgroundColor: config.bgColor,
          border: `1px solid ${config.borderColor}`,
          borderRadius: 1.5,
          mb: 1.5,
          p: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(config.color, 0.15),
            transform: 'translateX(4px)',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 40,
            color: config.color,
          }}
        >
          <Box
            sx={{
              p: 0.75,
              borderRadius: 1.5,
              backgroundColor: alpha(config.color, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography
              sx={{
                color: config.color,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.85rem',
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              {type === 'next-step' && <NextStepIcon sx={{ fontSize: '0.9rem', mr: 0.5, verticalAlign: 'middle' }} />}
              {title}
            </Typography>
          }
          secondary={
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.85rem',
                lineHeight: 1.4,
              }}
            >
              {description}
            </Typography>
          }
        />
        <Chip
          size="small"
          label={type}
          sx={{
            ml: 1,
            backgroundColor: config.bgColor,
            color: config.color,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 600,
          }}
        />
      </ListItem>
    );
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
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            color: '#ffffff',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '1.25rem',
            fontWeight: 700,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Lightbulb sx={{ color: STATUS_COLORS.info }} />
          Insights & Recommendations
        </Typography>
        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.9rem',
          }}
        >
          Personalized recommendations to optimize your mining performance and earnings.
        </Typography>
      </Box>

      {insights.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 2,
          }}
        >
          <CheckIcon
            sx={{
              fontSize: 48,
              color: STATUS_COLORS.success,
              mb: 2,
            }}
          />
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            Your performance looks great! No immediate actions needed.
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {insights.map((insight, index) => (
            <InsightItem
              key={index}
              type={insight.type}
              icon={insight.icon}
              title={insight.title}
              description={insight.description}
            />
          ))}
        </List>
      )}

      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <Chip
          size="small"
          label={insights.filter((i) => i.type === 'achievement').length}
          sx={{
            backgroundColor: alpha(STATUS_COLORS.success, 0.1),
            color: STATUS_COLORS.success,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.7rem',
          }}
        />
        <Chip
          size="small"
          label={`${insights.filter((i) => i.type === 'warning').length} Alerts`}
          sx={{
            backgroundColor: alpha('rgba(251, 146, 60, 0.9)', 0.1),
            color: 'rgba(251, 146, 60, 0.9)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.7rem',
          }}
        />
        <Chip
          size="small"
          label={`${insights.filter((i) => i.type === 'next-step').length} Next Steps`}
          sx={{
            backgroundColor: alpha(TIER_COLORS.gold, 0.1),
            color: TIER_COLORS.gold,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.7rem',
          }}
        />
      </Stack>
    </Card>
  );
};

export default MinerInsightsCard;
