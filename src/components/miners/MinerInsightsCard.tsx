import React, { useMemo } from 'react';
import { Box, Card, Chip, Typography, alpha } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
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
import {
  calculateDynamicOpenPrThreshold,
  calculateOpenIssueThreshold,
  parseNumber,
} from '../../utils/ExplorerUtils';
import { INSIGHT_COLORS } from '../../theme';

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

// ---------------------------------------------------------------------------
// Issue-mode insight generators
// ---------------------------------------------------------------------------

const getOpenIssueRiskInsight = (
  minerStats: MinerEvaluation,
): InsightItem | null => {
  const openIssues = parseNumber(minerStats.totalOpenIssues);
  const threshold = calculateOpenIssueThreshold(minerStats);
  const gap = threshold - openIssues;

  if (openIssues >= threshold) {
    return {
      id: 'open-issue-limit-hit',
      type: 'warning',
      title: 'Open issue limit exceeded',
      description: `You have ${openIssues} open issues against a threshold of ${threshold}. This triggers a full penalty on all discovery scores. Close or resolve open issues to recover.`,
      priority: 100,
    };
  }

  if (gap <= 2) {
    return {
      id: 'open-issue-limit-near',
      type: 'warning',
      title: 'Open issue limit approaching',
      description: `You are ${gap} issue${gap === 1 ? '' : 's'} away from your open-issue threshold (${threshold}). Avoid opening more issues until existing ones are resolved.`,
      priority: 85,
    };
  }

  return null;
};

const getIssueEligibilityInsight = (
  minerStats: MinerEvaluation,
): InsightItem | null => {
  const isIssueEligible = minerStats.isIssueEligible ?? false;

  if (isIssueEligible) return null;

  const validSolved = parseNumber(minerStats.totalValidSolvedIssues);
  const remaining = Math.max(7 - validSolved, 0);

  return {
    id: 'issue-eligibility-ineligible',
    type: 'warning',
    title: 'Not yet eligible for issue rewards',
    description:
      remaining > 0
        ? `You need ${remaining} more valid solved issue${remaining === 1 ? '' : 's'} (solving PR token score ≥ 5) to reach the 7-issue eligibility gate.`
        : 'Improve your issue credibility and token score to become eligible for issue discovery rewards.',
    priority: 90,
  };
};

const getIssueCredibilityInsight = (
  minerStats: MinerEvaluation,
): InsightItem => {
  const issueCred = parseNumber(minerStats.issueCredibility);
  const credPercent = (issueCred * 100).toFixed(1);
  const solvedIssues = parseNumber(minerStats.totalSolvedIssues);

  if (issueCred >= 0.9 && solvedIssues >= 7) {
    return {
      id: 'issue-credibility-excellent',
      type: 'achievement',
      title: 'Excellent issue credibility',
      description: `Issue credibility is ${credPercent}% across ${solvedIssues} solved issues. Your discovered issues consistently lead to quality solutions.`,
      priority: 50,
    };
  }

  if (issueCred < 0.6 && solvedIssues >= 3) {
    return {
      id: 'issue-credibility-needs-work',
      type: 'tip',
      title: 'Improve issue solve rate',
      description: `Issue credibility is ${credPercent}%. Focus on discovering issues that are clearly actionable and lead to high-quality solving PRs.`,
      priority: 70,
    };
  }

  return {
    id: 'issue-credibility-stable',
    type: 'tip',
    title: 'Keep issue credibility trending upward',
    description: `Issue credibility is ${credPercent}%. Prioritize discovering well-scoped issues to build a stronger track record.`,
    priority: 35,
  };
};

const getIssueSolvedInsight = (
  minerStats: MinerEvaluation,
): InsightItem | null => {
  const validSolved = parseNumber(minerStats.totalValidSolvedIssues);
  const totalSolved = parseNumber(minerStats.totalSolvedIssues);

  if (totalSolved > 0 && validSolved === 0) {
    return {
      id: 'no-valid-solved',
      type: 'tip',
      title: 'No valid solved issues yet',
      description:
        'Your solved issues have not yet produced solving PRs with token score ≥ 5. Discover issues that lead to more substantial code changes.',
      priority: 60,
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Shared rendering helpers
// ---------------------------------------------------------------------------

const getInsightStyle = (type: InsightType, theme: Theme) => {
  const isDark = theme.palette.mode === 'dark';
  switch (type) {
    case 'warning': {
      const c = INSIGHT_COLORS.warning;
      return {
        color: isDark ? c.darkColor : c.lightColor,
        accentColor: isDark ? c.darkAccent : c.lightAccent,
        background: isDark ? c.darkBg : c.lightBg,
        border: isDark ? c.darkBorder : c.lightBorder,
        icon: <WarningIcon sx={{ fontSize: '1rem' }} />,
      };
    }
    case 'achievement': {
      const c = INSIGHT_COLORS.achievement;
      return {
        color: isDark ? c.darkColor : c.lightColor,
        accentColor: isDark ? c.darkAccent : c.lightAccent,
        background: isDark ? c.darkBg : c.lightBg,
        border: isDark ? c.darkBorder : c.lightBorder,
        icon: <AchievementIcon sx={{ fontSize: '1rem' }} />,
      };
    }
    default: {
      const c = INSIGHT_COLORS.tip;
      return {
        color: isDark ? c.darkColor : c.lightColor,
        accentColor: isDark ? c.darkAccent : c.lightAccent,
        background: isDark ? c.darkBg : c.lightBg,
        border: isDark ? c.darkBorder : c.lightBorder,
        icon: <TipIcon sx={{ fontSize: '1rem' }} />,
      };
    }
  }
};

const assembleIssueInsights = (minerStats: MinerEvaluation): InsightItem[] => {
  const assembled: InsightItem[] = [];

  const openIssueInsight = getOpenIssueRiskInsight(minerStats);
  if (openIssueInsight) assembled.push(openIssueInsight);

  const eligibilityInsight = getIssueEligibilityInsight(minerStats);
  if (eligibilityInsight) assembled.push(eligibilityInsight);

  assembled.push(getIssueCredibilityInsight(minerStats));

  const solvedInsight = getIssueSolvedInsight(minerStats);
  if (solvedInsight) assembled.push(solvedInsight);

  return assembled;
};

const assemblePrInsights = (
  minerStats: MinerEvaluation,
  prScoring: RepositoryPrScoring | undefined,
): InsightItem[] => {
  const assembled: InsightItem[] = [];

  const openPrInsight = getOpenPrInsight(minerStats, prScoring);
  if (openPrInsight) assembled.push(openPrInsight);

  const collateralInsight = getCollateralInsight(minerStats);
  if (collateralInsight) assembled.push(collateralInsight);

  const eligibilityInsight = getEligibilityInsight(minerStats);
  if (eligibilityInsight) assembled.push(eligibilityInsight);

  assembled.push(getCredibilityInsight(minerStats));

  return assembled;
};

const MinerInsightsCard: React.FC<MinerInsightsCardProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  const muiTheme = useTheme();
  const { data: minerStats } = useMinerStats(githubId);
  const { data: generalConfig } = useGeneralConfig();

  const isIssueMode = viewMode === 'issues';

  const docsUrl = isIssueMode
    ? 'https://docs.gittensor.io/issue-discovery.html'
    : 'https://docs.gittensor.io/oss-contributions.html';

  const insights = useMemo(() => {
    if (!minerStats) return [];

    const assembled = isIssueMode
      ? assembleIssueInsights(minerStats)
      : assemblePrInsights(minerStats, generalConfig?.repositoryPrScoring);

    return assembled.sort((a, b) => b.priority - a.priority).slice(0, 4);
  }, [minerStats, generalConfig, isIssueMode]);

  if (!minerStats) return null;

  return (
    <Card
      sx={(t) => ({
        borderRadius: 3,
        p: 3,
        border: `1px solid ${t.palette.border.light}`,
      })}
      elevation={0}
    >
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            color: 'text.primary',
            fontSize: '1.05rem',
            fontWeight: 700,
            mb: 0.5,
            letterSpacing: '-0.01em',
          }}
        >
          {isIssueMode ? 'Issue Discovery Insights' : 'Insights & Next Actions'}
        </Typography>
        <Typography
          sx={{
            color: (t) => alpha(t.palette.text.primary, 0.5),
            fontSize: '0.82rem',
            lineHeight: 1.4,
          }}
        >
          {isIssueMode
            ? 'Recommendations based on your issue eligibility, credibility, and open-issue posture.'
            : 'Prioritized recommendations based on your eligibility, credibility, collateral, and open-PR posture.'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {insights.map((insight) => {
          const style = getInsightStyle(insight.type, muiTheme);
          return (
            <Box
              key={insight.id}
              sx={{
                borderRadius: 1.5,
                pl: 2,
                pr: 1.5,
                py: 1.25,
                border: `1px solid ${style.border}`,
                borderLeft: `3px solid ${style.accentColor}`,
                backgroundColor: style.background,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.25,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ color: style.accentColor, mt: 0.2, flexShrink: 0 }}>
                {style.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    columnGap: 1,
                    rowGap: 0.5,
                    mb: 0.4,
                  }}
                >
                  <Typography
                    sx={{
                      color: style.color,
                      fontSize: '0.83rem',
                      fontWeight: 700,
                      flex: '1 1 0',
                      minWidth: 0,
                      lineHeight: 1.35,
                    }}
                  >
                    {insight.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={insight.type.toUpperCase()}
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: style.color,
                      backgroundColor: style.border,
                      border: 'none',
                      height: 20,
                      flexShrink: 0,
                      alignSelf: 'flex-start',
                      '& .MuiChip-label': { px: 0.8 },
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    color: (t) => alpha(t.palette.text.primary, 0.65),
                    fontSize: '0.79rem',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {insight.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Typography
        sx={{
          mt: 2,
          textAlign: { xs: 'center', sm: 'right' },
          fontSize: '0.72rem',
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
