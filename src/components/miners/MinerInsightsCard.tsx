import React, { useMemo } from 'react';
import { Box, Card, Chip, Typography, alpha } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import {
  CheckCircle as AchievementIcon,
  ErrorOutline as WarningIcon,
  Lightbulb as TipIcon,
} from '@mui/icons-material';
import { useMinerStats } from '../../api';
import type { MinerRepositoryEvaluation } from '../../api/models/Dashboard';
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

/** Per-repo eligibility / score / credibility accessors, mode-aware. */
const eligibleFor = (
  repo: MinerRepositoryEvaluation,
  isIssueMode: boolean,
): boolean => (isIssueMode ? repo.isIssueEligible : repo.isEligible);

const scoreFor = (
  repo: MinerRepositoryEvaluation,
  isIssueMode: boolean,
): number => (isIssueMode ? repo.issueDiscoveryScore : repo.totalScore);

const credibilityFor = (
  repo: MinerRepositoryEvaluation,
  isIssueMode: boolean,
): number => (isIssueMode ? repo.issueCredibility : repo.credibility);

/**
 * Build per-repository insights. Each insight names the repository it
 * concerns. Eligibility verdicts come straight from the server-computed
 * `isEligible` / `isIssueEligible` flags — each repo applies its own
 * configurable gate, so no fixed threshold is ever printed here.
 */
const buildInsights = (
  repositories: MinerRepositoryEvaluation[],
  isIssueMode: boolean,
): InsightItem[] => {
  const assembled: InsightItem[] = [];

  if (repositories.length === 0) {
    assembled.push({
      id: 'no-repos',
      type: 'tip',
      title: 'No repository evaluations yet',
      description: isIssueMode
        ? 'Discover and solve issues in tracked repositories to start earning a per-repository standing.'
        : 'Open and merge pull requests in tracked repositories to start earning a per-repository standing.',
      priority: 40,
    });
    return assembled;
  }

  const eligibleRepos = repositories.filter((r) => eligibleFor(r, isIssueMode));
  const ineligibleRepos = repositories.filter(
    (r) => !eligibleFor(r, isIssueMode),
  );

  // Ineligible repos with a server-supplied reason — name the repo + reason.
  ineligibleRepos
    .filter((r) => r.failedReason)
    .slice(0, 2)
    .forEach((repo, index) => {
      assembled.push({
        id: `ineligible-${repo.repositoryFullName}`,
        type: 'warning',
        title: `Ineligible in ${repo.repositoryFullName}`,
        description: `${repo.failedReason} Credibility in this repository is ${(
          credibilityFor(repo, isIssueMode) * 100
        ).toFixed(1)}%.`,
        priority: 95 - index,
      });
    });

  // Ineligible with no reason string — generic prompt, still repo-named.
  const unexplainedIneligible = ineligibleRepos.find((r) => !r.failedReason);
  if (unexplainedIneligible && assembled.length < 3) {
    assembled.push({
      id: `ineligible-generic-${unexplainedIneligible.repositoryFullName}`,
      type: 'warning',
      title: `Not yet eligible in ${unexplainedIneligible.repositoryFullName}`,
      description: isIssueMode
        ? "Raise issue credibility and solved-issue volume to clear this repository's eligibility gate."
        : "Raise merge credibility and contribution volume to clear this repository's eligibility gate.",
      priority: 80,
    });
  }

  // Strongest eligible repo — an achievement that names where the miner leads.
  if (eligibleRepos.length > 0) {
    const topRepo = eligibleRepos.reduce((best, current) =>
      scoreFor(current, isIssueMode) > scoreFor(best, isIssueMode)
        ? current
        : best,
    );
    assembled.push({
      id: `top-repo-${topRepo.repositoryFullName}`,
      type: 'achievement',
      title: `Strongest in ${topRepo.repositoryFullName}`,
      description: `${
        isIssueMode ? 'Issue-discovery' : 'OSS'
      } score here is ${scoreFor(topRepo, isIssueMode).toFixed(2)} with ${(
        credibilityFor(topRepo, isIssueMode) * 100
      ).toFixed(1)}% credibility. Keep this consistency to maximize earnings.`,
      priority: 55,
    });
  }

  // Eligible-everywhere achievement, or a coverage tip.
  if (eligibleRepos.length === repositories.length) {
    assembled.push({
      id: 'eligible-all',
      type: 'achievement',
      title: 'Eligible across every repository',
      description: `You clear the gate in all ${repositories.length} evaluated ${
        repositories.length === 1 ? 'repository' : 'repositories'
      }.`,
      priority: 45,
    });
  } else if (eligibleRepos.length > 0) {
    assembled.push({
      id: 'coverage-tip',
      type: 'tip',
      title: 'Expand eligible coverage',
      description: `You are eligible in ${eligibleRepos.length} of ${
        repositories.length
      } repositories. Lifting credibility in the rest unlocks more of the network reward pool.`,
      priority: 35,
    });
  }

  return assembled;
};

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

/**
 * Per-repository-aware insights, rendered as a compact rail strip. Each
 * actionable item names the repository it concerns — per-repo gates make a
 * single miner-wide verdict meaningless.
 */
const MinerInsightsCard: React.FC<MinerInsightsCardProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  const muiTheme = useTheme();
  const { data: minerStats } = useMinerStats(githubId);
  const isIssueMode = viewMode === 'issues';

  const insights = useMemo(() => {
    if (!minerStats) return [];
    // Pre-migration placeholder rows carry an empty repo name — drop them.
    const repositories = (minerStats.repositories ?? []).filter(
      (r) => r.repositoryFullName.trim().length > 0,
    );
    return buildInsights(repositories, isIssueMode)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }, [minerStats, isIssueMode]);

  if (!minerStats || insights.length === 0) return null;

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
    </Card>
  );
};

export default MinerInsightsCard;
