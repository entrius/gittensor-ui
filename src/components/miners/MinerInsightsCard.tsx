import React, { useMemo } from 'react';
import { Box, Card, Typography, alpha } from '@mui/material';
import {
  CheckCircle as AchievementIcon,
  ErrorOutline as WarningIcon,
  Lightbulb as TipIcon,
} from '@mui/icons-material';
import { useMinerStats, useReposAndWeights } from '../../api';
import type { MinerRepositoryEvaluation } from '../../api/models/Dashboard';
import { STATUS_COLORS } from '../../theme';
import { buildRepoWeightsMap } from '../../utils/ExplorerUtils';

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
  weightsByRepo: Map<string, number> = new Map(),
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

  // Highest-paying repo — point the miner at the biggest reward pool.
  const topPaying = repositories
    .map((r) => ({
      repo: r,
      pay: weightsByRepo.get(r.repositoryFullName.toLowerCase()) ?? 0,
    }))
    .filter((x) => x.pay > 0)
    .sort((a, b) => b.pay - a.pay)[0];
  if (topPaying) {
    const pct = (topPaying.pay * 100).toFixed(topPaying.pay >= 0.1 ? 1 : 2);
    const eligibleThere = eligibleFor(topPaying.repo, isIssueMode);
    assembled.push({
      id: `pay-${topPaying.repo.repositoryFullName}`,
      type: eligibleThere ? 'achievement' : 'tip',
      title: eligibleThere
        ? `Keep shipping to ${topPaying.repo.repositoryFullName}`
        : `${topPaying.repo.repositoryFullName} pays the most`,
      description: eligibleThere
        ? `Your highest-paying repo distributes ${pct}% of the OSS reward pool and you're eligible — concentrate effort here to maximize emissions.`
        : `It distributes ${pct}% of the OSS reward pool — the biggest opportunity. Clear its eligibility gate to start earning from it.`,
      priority: 58,
    });
  }

  return assembled;
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

/**
 * Per-repository-aware insights, rendered as a compact rail strip. Each
 * actionable item names the repository it concerns — per-repo gates make a
 * single miner-wide verdict meaningless.
 */
const MinerInsightsCard: React.FC<MinerInsightsCardProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  const { data: minerStats } = useMinerStats(githubId);
  const { data: repos } = useReposAndWeights();
  const isIssueMode = viewMode === 'issues';

  const insights = useMemo(() => {
    if (!minerStats) return [];
    // Pre-migration placeholder rows carry an empty repo name — drop them.
    const repositories = (minerStats.repositories ?? []).filter(
      (r) => r.repositoryFullName.trim().length > 0,
    );
    const weights = repos
      ? buildRepoWeightsMap(repos)
      : new Map<string, number>();
    return buildInsights(repositories, isIssueMode, weights)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }, [minerStats, repos, isIssueMode]);

  if (!minerStats || insights.length === 0) return null;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        p: 2.5,
      }}
      elevation={0}
    >
      <Typography variant="statLabel" sx={{ display: 'block', mb: 1.5 }}>
        {isIssueMode ? 'Issue discovery — next moves' : 'Next moves'}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                borderLeft: `3px solid ${style.color}`,
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.1,
                minWidth: 0,
              }}
            >
              <Box sx={{ color: style.color, mt: 0.15, flexShrink: 0 }}>
                {style.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    color: style.color,
                    fontSize: '0.81rem',
                    fontWeight: 600,
                    wordBreak: 'break-word',
                  }}
                >
                  {insight.title}
                </Typography>
                <Typography
                  sx={{
                    color: (t) => alpha(t.palette.text.primary, 0.68),
                    fontSize: '0.78rem',
                    mt: 0.35,
                    lineHeight: 1.45,
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
