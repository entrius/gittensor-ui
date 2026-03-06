import React, { useMemo } from 'react';
import {
  Card,
  Typography,
  Box,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  Lightbulb as InsightIcon,
  TrendingUp as GrowthIcon,
  Warning as WarningIcon,
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import {
  useMinerStats,
  useMinerPRs,
  useReposAndWeights,
  useTierConfigurations,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

interface MinerInsightsProps {
  githubId: string;
}

interface Insight {
  type: 'success' | 'warning' | 'tip' | 'achievement';
  icon: React.ReactNode;
  message: string;
  color: string;
}

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const MinerInsights: React.FC<MinerInsightsProps> = ({ githubId }) => {
  const { data: minerStats, isLoading } = useMinerStats(githubId);
  const { data: prs } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();
  const { data: tierConfigData } = useTierConfigurations();

  // Build repo weight map
  const repoWeights = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(repos)) {
      repos.forEach((repo) => {
        if (repo?.fullName) {
          map.set(repo.fullName, parseFloat(repo.weight || '0'));
        }
      });
    }
    return map;
  }, [repos]);

  const insights = useMemo((): Insight[] => {
    if (!minerStats) return [];

    const result: Insight[] = [];
    const currentTierLevel =
      TIER_LEVELS[(minerStats.currentTier || '').toLowerCase()] || 0;
    const tierConfigs = tierConfigData?.tiers;
    const credibility = Number(minerStats.credibility || 0);
    const openPrs = Number(minerStats.totalOpenPrs || 0);
    const mergedPrs = Number(minerStats.totalMergedPrs || 0);
    const closedPrs = Number(minerStats.totalClosedPrs || 0);

    // Tier unlock proximity insights
    if (currentTierLevel < 3) {
      const nextTierNames = ['Bronze', 'Silver', 'Gold'];
      const nextTierName = nextTierNames[currentTierLevel]; // 0->Bronze, 1->Silver, 2->Gold
      const nextConfig = tierConfigs?.find(
        (t) => t.name.toLowerCase() === nextTierName.toLowerCase(),
      );

      if (nextConfig) {
        const tierKey = nextTierName.toLowerCase() as
          | 'bronze'
          | 'silver'
          | 'gold';
        const qualifiedRepos = Number(
          minerStats[
            `${tierKey}QualifiedUniqueRepos` as keyof typeof minerStats
          ] || 0,
        );
        const tierCredibility = Number(
          minerStats[
            `${tierKey}Credibility` as keyof typeof minerStats
          ] || 0,
        );
        const tierTokenScore = Number(
          minerStats[
            `${tierKey}TokenScore` as keyof typeof minerStats
          ] || 0,
        );

        const reposNeeded =
          nextConfig.requiredQualifiedUniqueRepos - qualifiedRepos;
        if (reposNeeded > 0 && reposNeeded <= 3) {
          result.push({
            type: 'tip',
            icon: <GrowthIcon sx={{ fontSize: '1.1rem' }} />,
            message: `Your ${nextTierName} tier is ${reposNeeded} qualified repo${reposNeeded > 1 ? 's' : ''} away from unlocking!`,
            color: '#a3e635',
          });
        }

        if (
          nextConfig.requiredMinTokenScore &&
          tierTokenScore < nextConfig.requiredMinTokenScore
        ) {
          const tokenNeeded =
            nextConfig.requiredMinTokenScore - tierTokenScore;
          result.push({
            type: 'tip',
            icon: <StarIcon sx={{ fontSize: '1.1rem' }} />,
            message: `Need ${tokenNeeded.toFixed(0)} more token score in ${nextTierName} repos to unlock that tier.`,
            color: TIER_COLORS[tierKey as keyof typeof TIER_COLORS],
          });
        }
      }
    }

    // Credibility insights
    if (credibility < 0.9 && credibility >= 0.7) {
      const prsNeeded = Math.ceil(
        (0.9 * (mergedPrs + closedPrs) - mergedPrs) / (1 - 0.9),
      );
      if (prsNeeded > 0 && prsNeeded <= 10) {
        result.push({
          type: 'tip',
          icon: <GrowthIcon sx={{ fontSize: '1.1rem' }} />,
          message: `Your credibility is ${(credibility * 100).toFixed(0)}% - merging ${prsNeeded} more PR${prsNeeded > 1 ? 's' : ''} (without closures) will reach 90%.`,
          color: '#a3e635',
        });
      }
    }

    if (credibility >= 1.0 && mergedPrs >= 5) {
      result.push({
        type: 'achievement',
        icon: <TrophyIcon sx={{ fontSize: '1.1rem' }} />,
        message: `Perfect 100% credibility with ${mergedPrs} merged PRs - exceptional track record!`,
        color: STATUS_COLORS.success,
      });
    }

    // Open PR risk warning
    if (openPrs >= 5) {
      result.push({
        type: 'warning',
        icon: <WarningIcon sx={{ fontSize: '1.1rem' }} />,
        message: `You have ${openPrs} open PRs. Open PRs have collateral deducted from your score. Consider closing or getting them merged.`,
        color: STATUS_COLORS.warning,
      });
    }

    const collateral = Number(minerStats.totalCollateralScore || 0);
    if (collateral > 0) {
      result.push({
        type: 'warning',
        icon: <WarningIcon sx={{ fontSize: '1.1rem' }} />,
        message: `${collateral.toFixed(2)} score is held as collateral for open PRs. Getting them merged will recover this score.`,
        color: '#fb923c',
      });
    }

    // Top repos insight
    if (prs && prs.length > 0) {
      const repoScores = new Map<string, number>();
      prs.forEach((pr) => {
        const existing = repoScores.get(pr.repository) || 0;
        repoScores.set(pr.repository, existing + parseFloat(pr.score || '0'));
      });

      const topRepos = Array.from(repoScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (topRepos.length > 0) {
        const topRepoStr = topRepos
          .map(([repo, score]) => {
            const weight = repoWeights.get(repo);
            return `${repo.split('/').pop()} (${score.toFixed(2)}${weight ? `, weight: ${weight.toFixed(2)}` : ''})`;
          })
          .join(', ');

        result.push({
          type: 'success',
          icon: <InsightIcon sx={{ fontSize: '1.1rem' }} />,
          message: `Your highest-scoring repos: ${topRepoStr}`,
          color: STATUS_COLORS.info,
        });
      }
    }

    // Current tier achievement
    if (currentTierLevel === 3) {
      result.push({
        type: 'achievement',
        icon: <TrophyIcon sx={{ fontSize: '1.1rem' }} />,
        message:
          'All tiers unlocked! You are contributing at the highest level across Bronze, Silver, and Gold repositories.',
        color: TIER_COLORS.gold,
      });
    }

    return result;
  }, [minerStats, prs, repoWeights, tierConfigData]);

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

  if (!minerStats || insights.length === 0) return null;

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
          mb: 2.5,
          fontWeight: 600,
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          '&::before': {
            content: '""',
            width: '4px',
            height: '20px',
            backgroundColor: STATUS_COLORS.info,
            borderRadius: '2px',
          },
        }}
      >
        Insights & Recommendations
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {insights.map((insight, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
              p: 2,
              borderRadius: 2,
              backgroundColor: alpha(insight.color, 0.05),
              border: `1px solid ${alpha(insight.color, 0.15)}`,
            }}
          >
            <Box
              sx={{
                color: insight.color,
                mt: 0.25,
                flexShrink: 0,
              }}
            >
              {insight.icon}
            </Box>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.85rem',
                lineHeight: 1.6,
              }}
            >
              {insight.message}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
};

export default MinerInsights;
