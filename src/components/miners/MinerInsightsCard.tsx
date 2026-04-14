import React, { useMemo } from 'react';
import { Box, Card, Chip, Typography, alpha } from '@mui/material';
import {
  CheckCircle as AchievementIcon,
  ErrorOutline as WarningIcon,
  Lightbulb as TipIcon,
} from '@mui/icons-material';
import {
  useGeneralConfig,
  useMinerStats,
  type MinerEvaluation,
  type RepositoryPrScoring,
} from '../../api';
import { STATUS_COLORS } from '../../theme';
import {
  calculateDynamicOpenPrThreshold,
  parseNumber,
} from '../../utils/ExplorerUtils';

interface MinerInsightsCardProps {
  githubId: string;
  viewMode?: 'prs' | 'issues';
}

type InsightType = 'warning' | 'tip' | 'achievement';

interface InsightItem {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  priority: number;
}

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

const getEligibilityInsight = (
  minerStats: MinerEvaluation,
): InsightItem | null => {
  const isEligible = minerStats.isEligible ?? false;

  if (isEligible) return null;

  return {
    id: 'eligibility-ineligible',
    type: 'warning',
    title: 'Not yet eligible',
    description:
      'You are currently ineligible for rewards. Improve your credibility, increase your token score, and contribute to more repositories to become eligible.',
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
    default:
      return {
        color: STATUS_COLORS.info,
        border: alpha(STATUS_COLORS.info, 0.35),
        background: alpha(STATUS_COLORS.info, 0.1),
        icon: <TipIcon sx={{ fontSize: '1rem' }} />,
      };
  }
};

const MinerInsightsCard: React.FC<MinerInsightsCardProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  const { data: minerStats } = useMinerStats(githubId);
  const { data: generalConfig } = useGeneralConfig();

  const docsUrl =
    viewMode === 'issues'
      ? 'https://docs.gittensor.io/issue-discovery.html'
      : 'https://docs.gittensor.io/oss-contributions.html';

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

    const eligibilityInsight = getEligibilityInsight(minerStats);
    if (eligibilityInsight) assembled.push(eligibilityInsight);

    assembled.push(getCredibilityInsight(minerStats));

    return assembled.sort((a, b) => b.priority - a.priority).slice(0, 4);
  }, [minerStats, generalConfig]);

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
          Prioritized recommendations based on your eligibility, credibility,
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
          href={docsUrl}
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
