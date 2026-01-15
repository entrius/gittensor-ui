import React from 'react';
import { Box, Typography, Grid, Card, CircularProgress } from '@mui/material';
import {
  useMinerStats,
  useTierConfigurations,
  type TierConfig,
} from '../../api';
import { TierCard } from './TierComponents';

const TIER_LEVELS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const getTierLevel = (tier: string | undefined | null): number => {
  if (!tier) return 0; // No tier yet - working towards bronze
  return TIER_LEVELS[tier.toLowerCase()] || 0;
};

const getTierConfig = (
  tierName: string,
  tierConfigs: TierConfig[] | undefined,
): TierConfig | undefined =>
  tierConfigs?.find((t) => t.name.toLowerCase() === tierName.toLowerCase());

const getPreviousTierName = (level: number): string => {
  const tierNames = ['', 'Bronze', 'Silver', 'Gold'];
  return tierNames[level - 1] || '';
};

const getTooltipMessage = (
  tierName: string,
  tierLevel: number,
  isNextTier: boolean,
  config: TierConfig | undefined,
): string => {
  if (!config) {
    if (isNextTier) {
      return `${tierName} tier unlock in progress. Continue contributing to ${tierName} tier repos to unlock this tier.`;
    }
    const prevTier = getPreviousTierName(tierLevel);
    return `${tierName} tier isn't unlocked yet, so contributions earn 0 points. It will only be eligible to unlock after ${prevTier} is unlocked.`;
  }

  const reqQualifiedRepos = config.requiredQualifiedUniqueRepos;
  const reqTokenScorePerRepo = config.requiredMinTokenScorePerRepo;
  const reqCred = (config.requiredCredibility * 100).toFixed(0);
  const reqTokenScore = config.requiredMinTokenScore;

  if (isNextTier) {
    const tokenScoreReq = reqTokenScore
      ? ` with ${reqTokenScore}+ total token score and`
      : '';
    return `${tierName} tier unlock in progress. Requires${tokenScoreReq} ${reqQualifiedRepos} qualified repos (each with ${reqTokenScorePerRepo}+ token score) and ${reqCred}%+ credibility.`;
  }

  const prevTier = getPreviousTierName(tierLevel);
  return `${tierName} tier isn't unlocked yet, so contributions earn 0 points. It will only be eligible to unlock after ${prevTier} is unlocked.`;
};

interface MinerTierPerformanceProps {
  githubId: string;
}

const MinerTierPerformance: React.FC<MinerTierPerformanceProps> = ({
  githubId,
}) => {
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  const { data: tierConfigData } = useTierConfigurations();

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={30} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error || !minerStats) {
    return null; // Don't show anything if no data
  }

  const tierConfigs = tierConfigData?.tiers;
  const currentTierLevel = getTierLevel(minerStats.currentTier);

  const tiers = [
    {
      name: 'Bronze',
      level: 1,
      color: '#CD7F32',
      bgColor: 'rgba(205, 127, 50, 0.05)',
      borderColor: 'rgba(205, 127, 50, 0.2)',
      stats: {
        score: minerStats.bronzeScore,
        credibility: minerStats.bronzeCredibility,
        merged: minerStats.bronzeMergedPrs,
        closed: minerStats.bronzeClosedPrs,
        total: minerStats.bronzeTotalPrs,
        collateral: minerStats.bronzeCollateralScore,
        uniqueRepos: minerStats.bronzeUniqueRepos,
        qualifiedUniqueRepos: minerStats.bronzeQualifiedUniqueRepos,
        tokenScore: minerStats.bronzeTokenScore,
      },
    },
    {
      name: 'Silver',
      level: 2,
      color: '#C0C0C0',
      bgColor: 'rgba(192, 192, 192, 0.05)',
      borderColor: 'rgba(192, 192, 192, 0.2)',
      stats: {
        score: minerStats.silverScore,
        credibility: minerStats.silverCredibility,
        merged: minerStats.silverMergedPrs,
        closed: minerStats.silverClosedPrs,
        total: minerStats.silverTotalPrs,
        collateral: minerStats.silverCollateralScore,
        uniqueRepos: minerStats.silverUniqueRepos,
        qualifiedUniqueRepos: minerStats.silverQualifiedUniqueRepos,
        tokenScore: minerStats.silverTokenScore,
      },
    },
    {
      name: 'Gold',
      level: 3,
      color: '#FFD700',
      bgColor: 'rgba(255, 215, 0, 0.05)',
      borderColor: 'rgba(255, 215, 0, 0.2)',
      stats: {
        score: minerStats.goldScore,
        credibility: minerStats.goldCredibility,
        merged: minerStats.goldMergedPrs,
        closed: minerStats.goldClosedPrs,
        total: minerStats.goldTotalPrs,
        collateral: minerStats.goldCollateralScore,
        uniqueRepos: minerStats.goldUniqueRepos,
        qualifiedUniqueRepos: minerStats.goldQualifiedUniqueRepos,
        tokenScore: minerStats.goldTokenScore,
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
        mb: 3,
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
            backgroundColor: 'primary.main',
            borderRadius: '2px',
          },
        }}
      >
        Tier Performance
      </Typography>

      <Grid container spacing={2}>
        {tiers.map((tier) => {
          const isLocked = tier.level > currentTierLevel;
          const isNextTier = tier.level === currentTierLevel + 1;
          const config = getTierConfig(tier.name, tierConfigs);

          // Calculate progress towards unlocking this tier
          const tokenScore = tier.stats.tokenScore || 0;
          const qualifiedReposCount = tier.stats.qualifiedUniqueRepos || 0;
          const credibility = tier.stats.credibility || 0;
          const requiredTokenScore = config?.requiredMinTokenScore ?? null;
          const requiredQualifiedRepos =
            config?.requiredQualifiedUniqueRepos || 3;
          const requiredCredibility = config?.requiredCredibility || 0.7;

          const tokenScoreProgress = requiredTokenScore
            ? Math.min((tokenScore / requiredTokenScore) * 100, 100)
            : 100;
          const qualifiedReposProgress = Math.min(
            (qualifiedReposCount / requiredQualifiedRepos) * 100,
            100,
          );
          const credibilityProgress = Math.min(
            (credibility / requiredCredibility) * 100,
            100,
          );

          const unlockProgress =
            (isNextTier || !isLocked) && config
              ? {
                  tokenScore,
                  requiredTokenScore,
                  tokenScoreProgress,
                  qualifiedReposCount,
                  requiredQualifiedRepos,
                  qualifiedReposProgress,
                  credibility,
                  requiredCredibility,
                  credibilityProgress,
                }
              : undefined;

          return (
            <Grid item xs={12} md={4} key={tier.name}>
              <TierCard
                name={tier.name}
                color={tier.color}
                bgColor={tier.bgColor}
                borderColor={tier.borderColor}
                stats={tier.stats}
                isLocked={isLocked}
                isNextTier={isNextTier}
                tooltipMessage={
                  isLocked
                    ? getTooltipMessage(
                        tier.name,
                        tier.level,
                        isNextTier,
                        config,
                      )
                    : undefined
                }
                unlockProgress={unlockProgress}
              />
            </Grid>
          );
        })}
      </Grid>
    </Card>
  );
};

export default MinerTierPerformance;
