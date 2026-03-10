import React, { useMemo } from 'react';
import { Box, Card, Typography, useTheme } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { useMinerStats, useTierConfigurations } from '../../api';
import { TIER_COLORS } from '../../theme';
import { parseNumber, TIER_LEVELS } from './explorerUtils';

interface MinerFocusCardProps {
  githubId: string;
}

export const MinerFocusCard: React.FC<MinerFocusCardProps> = ({ githubId }) => {
  const theme = useTheme();
  const { data: minerStats } = useMinerStats(githubId);
  const { data: tierData } = useTierConfigurations();

  const focus = useMemo(() => {
    if (!minerStats) return null;
    const currentTier = (minerStats.currentTier || '').trim();
    const level = TIER_LEVELS[currentTier.toLowerCase()] || 0;
    const totalPrs = parseNumber(minerStats.totalPrs);
    const isNewMiner = level <= 1 && totalPrs < 15;
    const nextTierLevel = level + 1;
    const nextTierName =
      nextTierLevel === 1 ? 'Bronze' : nextTierLevel === 2 ? 'Silver' : 'Gold';
    const tierConfigs = tierData?.tiers ?? [];
    const nextConfig = tierConfigs.find(
      (t) => t.name.toLowerCase() === nextTierName.toLowerCase(),
    );
    if (isNewMiner && nextConfig && nextTierLevel <= 3) {
      const tokenScore =
        nextTierLevel === 1
          ? parseNumber(minerStats.bronzeTokenScore)
          : nextTierLevel === 2
            ? parseNumber(minerStats.silverTokenScore)
            : parseNumber(minerStats.goldTokenScore);
      const qualifiedRepos =
        nextTierLevel === 1
          ? parseNumber(minerStats.bronzeQualifiedUniqueRepos)
          : nextTierLevel === 2
            ? parseNumber(minerStats.silverQualifiedUniqueRepos)
            : parseNumber(minerStats.goldQualifiedUniqueRepos);
      const credibility =
        nextTierLevel === 1
          ? parseNumber(minerStats.bronzeCredibility)
          : nextTierLevel === 2
            ? parseNumber(minerStats.silverCredibility)
            : parseNumber(minerStats.goldCredibility);
      const reqToken = nextConfig.requiredMinTokenScore ?? 0;
      const reqRepos = nextConfig.requiredQualifiedUniqueRepos || 3;
      const reqCred = nextConfig.requiredCredibility || 0.7;
      const tokenPct =
        reqToken > 0 ? Math.min((tokenScore / reqToken) * 100, 100) : 100;
      const reposPct = Math.min((qualifiedRepos / reqRepos) * 100, 100);
      const credPct = Math.min((credibility / reqCred) * 100, 100);
      const overallPct =
        reqToken > 0
          ? (tokenPct + reposPct + credPct) / 3
          : (reposPct + credPct) / 2;
      const steps: string[] = [];
      if (tokenPct < 100 && reqToken > 0)
        steps.push(
          `Reach ${reqToken} token score in ${nextTierName} repos (${Math.round(tokenPct)}% there)`,
        );
      if (reposPct < 100)
        steps.push(
          `Get ${reqRepos} qualified ${nextTierName} repos (${qualifiedRepos}/${reqRepos})`,
        );
      if (credPct < 100)
        steps.push(
          `Reach ${(reqCred * 100).toFixed(0)}% credibility in ${nextTierName} (${(credibility * 100).toFixed(0)}% now)`,
        );
      return {
        type: 'unlock' as const,
        nextTierName,
        overallPct: Math.round(overallPct),
        steps: steps.slice(0, 2),
        color:
          nextTierName === 'Gold'
            ? TIER_COLORS.gold
            : nextTierName === 'Silver'
              ? TIER_COLORS.silver
              : TIER_COLORS.bronze,
      };
    }
    return {
      type: 'earnings' as const,
      usdPerDay: parseNumber(minerStats.usdPerDay),
      totalScore: parseNumber(minerStats.totalScore),
      currentTier: currentTier || 'Unranked',
    };
  }, [minerStats, tierData]);

  if (!focus || !minerStats) return null;

  if (focus.type === 'unlock') {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${focus.color}40`,
          backgroundColor: `${focus.color}08`,
          p: { xs: 2, sm: 2.5 },
        }}
        elevation={0}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <LockOpenIcon sx={{ color: focus.color, fontSize: 28, mt: 0.25 }} />
          <Box>
            <Typography
              sx={{
                color: theme.palette.text.primary,
                fontFamily: theme.typography.mono.fontFamily,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Your next milestone: Unlock {focus.nextTierName}
            </Typography>
            <Typography
              sx={{
                color: theme.palette.text.secondary,
                fontFamily: theme.typography.mono.fontFamily,
                fontSize: '0.8rem',
                mt: 0.5,
              }}
            >
              {focus.overallPct === 0
                ? `Focus on the steps below to unlock ${focus.nextTierName}.`
                : `You're about ${focus.overallPct}% of the way there. Focus on:`}
            </Typography>
            <Box
              component="ul"
              sx={{
                m: 0,
                mt: 1,
                pl: 2.5,
                color: theme.palette.text.primary,
                fontFamily: theme.typography.mono.fontFamily,
                fontSize: '0.78rem',
                lineHeight: 1.6,
              }}
            >
              {focus.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>
    );
  }

  const usdDisplay = Number(focus.usdPerDay).toFixed(2);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        backgroundColor: theme.palette.surface.subtle,
        p: { xs: 2, sm: 2.5 },
      }}
      elevation={0}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <TrendingUpIcon
          sx={{ color: 'primary.main', fontSize: 28, mt: 0.25 }}
        />
        <Box>
          <Typography
            sx={{
              color: 'text.primary',
              fontFamily: theme.typography.mono.fontFamily,
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Earnings & score at a glance
          </Typography>
          <Typography
            sx={{
              color: (t) => t.palette.text.secondary,
              fontFamily: theme.typography.mono.fontFamily,
              fontSize: '0.8rem',
              mt: 0.5,
            }}
          >
            {focus.currentTier} tier · ${usdDisplay}/day est. · Score{' '}
            {focus.totalScore.toFixed(2)}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default MinerFocusCard;
