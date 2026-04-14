import React, { useMemo } from 'react';
import { Box, Card, Chip, Typography, alpha } from '@mui/material';
import {
  CheckCircle as AchievementIcon,
  ErrorOutline as WarningIcon,
  Lightbulb as TipIcon,
} from '@mui/icons-material';
import { useMinerStats, type MinerEvaluation } from '../../api';
import { STATUS_COLORS } from '../../theme';
import { parseNumber } from '../../utils/ExplorerUtils';

interface MinerIssueInsightsCardProps {
  githubId: string;
}

type InsightType = 'warning' | 'tip' | 'achievement';

interface InsightItem {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  priority: number;
}

const getOpenIssueInsight = (
  minerStats: MinerEvaluation,
): InsightItem | null => {
  const openIssues = parseNumber(minerStats.totalOpenIssues);
  const tokenScore = parseNumber(minerStats.issueTokenScore);
  const threshold = Math.min(5 + Math.floor(tokenScore / 300), 30);
  const gap = threshold - openIssues;

  if (openIssues >= threshold) {
    return {
      id: 'open-issue-limit-hit',
      type: 'warning',
      title: 'Open issue limit exceeded',
      description: `You currently have ${openIssues} open issues against a threshold of ${threshold}. This triggers a full penalty on all discovery scores. Close or resolve pending issues to recover.`,
      priority: 100,
    };
  }

  if (gap <= 2) {
    return {
      id: 'open-issue-limit-near',
      type: 'warning',
      title: 'Open issue risk approaching',
      description: `You are ${gap} issue${gap === 1 ? '' : 's'} away from your open-issue threshold (${threshold}). Exceeding it triggers a full penalty on all discovery scores.`,
      priority: 85,
    };
  }

  return null;
};

const getIssueCredibilityInsight = (
  minerStats: MinerEvaluation,
): InsightItem => {
  const credibility = parseNumber(minerStats.issueCredibility);
  const credibilityPercent = (credibility * 100).toFixed(1);
  const solvedIssues = parseNumber(minerStats.totalSolvedIssues);

  if (credibility >= 0.8 && solvedIssues >= 7) {
    return {
      id: 'issue-credibility-excellent',
      type: 'achievement',
      title: 'Strong issue credibility',
      description: `Your issue credibility is ${credibilityPercent}% — well above the 80% eligibility threshold. Quality issue filing is being rewarded.`,
      priority: 50,
    };
  }

  if (credibility < 0.8 && solvedIssues >= 3) {
    return {
      id: 'issue-credibility-needs-work',
      type: 'tip',
      title: 'Improve issue credibility',
      description: `Issue credibility is currently ${credibilityPercent}%. You need 80%+ for eligibility. Focus on filing well-scoped, actionable issues that are more likely to be solved.`,
      priority: 70,
    };
  }

  return {
    id: 'issue-credibility-stable',
    type: 'tip',
    title: 'Keep issue credibility trending upward',
    description: `Issue credibility is ${credibilityPercent}%. File quality issues to move toward the top credibility band.`,
    priority: 35,
  };
};

const getIssueEligibilityInsight = (
  minerStats: MinerEvaluation,
): InsightItem | null => {
  const isEligible = minerStats.isIssueEligible ?? false;
  const validSolved = parseNumber(minerStats.totalValidSolvedIssues);
  const credibility = parseNumber(minerStats.issueCredibility);

  if (isEligible) {
    return {
      id: 'issue-eligible',
      type: 'achievement',
      title: 'Issue discovery eligible',
      description: `You meet all eligibility requirements: ${validSolved} valid solved issues (need 7) and ${(credibility * 100).toFixed(1)}% credibility (need 80%).`,
      priority: 40,
    };
  }

  const needs: string[] = [];
  if (validSolved < 7)
    needs.push(`${7 - validSolved} more valid solved issues`);
  if (credibility < 0.8) needs.push('80%+ issue credibility');

  return {
    id: 'issue-eligibility-progress',
    type: 'tip',
    title: 'Issue discovery progress',
    description: `You have ${validSolved} valid solved issues (need 7) and ${(credibility * 100).toFixed(1)}% credibility (need 80%). Still need: ${needs.join(', ')}.`,
    priority: 90,
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

const MinerIssueInsightsCard: React.FC<MinerIssueInsightsCardProps> = ({
  githubId,
}) => {
  const { data: minerStats } = useMinerStats(githubId);

  const insights = useMemo(() => {
    if (!minerStats) return [];

    const assembled: InsightItem[] = [];

    const openIssueInsight = getOpenIssueInsight(minerStats);
    if (openIssueInsight) assembled.push(openIssueInsight);

    const eligibilityInsight = getIssueEligibilityInsight(minerStats);
    if (eligibilityInsight) assembled.push(eligibilityInsight);

    assembled.push(getIssueCredibilityInsight(minerStats));

    return assembled.sort((a, b) => b.priority - a.priority).slice(0, 4);
  }, [minerStats]);

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
          Recommendations based on your issue discovery eligibility,
          credibility, and open issue posture.
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
        Learn more about issue discovery in the{' '}
        <Typography
          component="a"
          href="https://docs.gittensor.io/issue-discovery.html"
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

export default MinerIssueInsightsCard;
