import React, { useMemo } from 'react';
import { Box, Card, Typography, Grid, CircularProgress } from '@mui/material';
import { subDays, format } from 'date-fns';
import {
  useMinerStats,
  useIssues,
  useAllMiners,
  useReposAndWeights,
} from '../../api';
import { ContributionHeatmap } from '../dashboard';
import TrustBadge from './TrustBadge';
import IssueCredibilityChart from './IssueCredibilityChart';
import IssuePerformanceRadar from './IssuePerformanceRadar';
import { parseNumber } from '../../utils/ExplorerUtils';

const computeAvgRepoWeight = (
  minerIssues: { repositoryFullName: string }[],
  repos: Array<{ fullName?: string; weight?: string }> | undefined,
): number => {
  if (minerIssues.length === 0 || !repos || !Array.isArray(repos)) return 0;
  const repoWeights = new Map<string, number>();
  repos.forEach((repo) => {
    if (repo?.fullName)
      repoWeights.set(repo.fullName, parseFloat(repo.weight || '0'));
  });
  const uniqueRepos = new Set(minerIssues.map((i) => i.repositoryFullName));
  let totalWeight = 0;
  uniqueRepos.forEach((repo) => {
    totalWeight += repoWeights.get(repo) || 0;
  });
  return Math.min((totalWeight / uniqueRepos.size) * 100, 100);
};

interface MinerIssueActivityProps {
  githubId: string;
}

const MinerIssueActivity: React.FC<MinerIssueActivityProps> = ({
  githubId,
}) => {
  const { data: minerStats } = useMinerStats(githubId);
  const { data: allIssues, isLoading: isLoadingIssues } = useIssues();
  const { data: allMinerStats } = useAllMiners();
  const { data: repos } = useReposAndWeights();

  const hotkey = minerStats?.hotkey || '';

  const minerIssues = useMemo(() => {
    if (!allIssues || !hotkey) return [];
    return allIssues.filter((issue) => issue.solverHotkey === hotkey);
  }, [allIssues, hotkey]);

  // Calculate issue heatmap data based on completedAt dates
  const { contributionData, contributionsLast30Days, totalDaysShown } =
    useMemo(() => {
      if (minerIssues.length === 0) {
        return {
          contributionData: [],
          contributionsLast30Days: 0,
          totalDaysShown: 0,
        };
      }

      const today = new Date();
      let earliestDate = today;

      minerIssues.forEach((issue) => {
        const dateStr = issue.completedAt || issue.createdAt;
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime()) && d < earliestDate) earliestDate = d;
        }
      });

      const diffTime = Math.abs(today.getTime() - earliestDate.getTime());
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysToShow = Math.max(daysDiff, 1);

      const dataMap = new Map<string, number>();
      for (let i = daysToShow; i >= 0; i--) {
        dataMap.set(format(subDays(today, i), 'yyyy-MM-dd'), 0);
      }

      let last30Count = 0;
      const thirtyDaysAgo = subDays(today, 30);

      minerIssues.forEach((issue) => {
        const dateStr = issue.completedAt || issue.createdAt;
        if (!dateStr) return;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return;

        const dateKey = format(date, 'yyyy-MM-dd');
        if (dataMap.has(dateKey)) {
          dataMap.set(dateKey, (dataMap.get(dateKey) || 0) + 1);
        }
        if (date >= thirtyDaysAgo) last30Count++;
      });

      const data = Array.from(dataMap.entries())
        .map(([date, count]) => {
          let level: 0 | 1 | 2 | 3 | 4 = 0;
          if (count > 0) level = 1;
          if (count >= 2) level = 2;
          if (count >= 3) level = 3;
          if (count >= 5) level = 4;
          return { date, count, level };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        contributionData: data,
        contributionsLast30Days: last30Count,
        totalDaysShown: daysToShow,
      };
    }, [minerIssues]);

  // Issue stats for credibility chart
  const issueStats = useMemo(() => {
    return {
      solved: parseNumber(minerStats?.totalSolvedIssues) || 0,
      open: parseNumber(minerStats?.totalOpenIssues) || 0,
      closed: parseNumber(minerStats?.totalClosedIssues) || 0,
      credibility: parseNumber(minerStats?.issueCredibility) || 0,
    };
  }, [minerStats]);

  // Calculate radar chart values (normalized to 100) — issue-focused
  const radarValues = useMemo(() => {
    if (!minerStats || !allMinerStats || allMinerStats.length === 0) {
      return {
        credibility: 0,
        tokenScore: 0,
        solvedIssues: 0,
        uniqueRepos: 0,
        totalIssues: 0,
        avgRepoWeight: 0,
      };
    }

    const maxIssueCred = Math.max(
      ...allMinerStats.map((m) => Number(m.issueCredibility) || 0),
      0.01,
    );
    const maxIssueTokenScore = Math.max(
      ...allMinerStats.map((m) => Number(m.issueTokenScore) || 0),
      1,
    );
    const maxSolvedIssues = Math.max(
      ...allMinerStats.map((m) => Number(m.totalSolvedIssues) || 0),
      1,
    );
    const maxUniqueRepos = Math.max(
      ...allMinerStats.map((m) => Number(m.uniqueReposCount) || 0),
      1,
    );
    const maxTotalIssues = Math.max(
      ...allMinerStats.map(
        (m) =>
          (Number(m.totalSolvedIssues) || 0) +
          (Number(m.totalOpenIssues) || 0) +
          (Number(m.totalClosedIssues) || 0),
      ),
      1,
    );

    const totalIssues =
      (Number(minerStats.totalSolvedIssues) || 0) +
      (Number(minerStats.totalOpenIssues) || 0) +
      (Number(minerStats.totalClosedIssues) || 0);

    return {
      credibility:
        ((Number(minerStats.issueCredibility) || 0) / maxIssueCred) * 100,
      tokenScore:
        ((Number(minerStats.issueTokenScore) || 0) / maxIssueTokenScore) * 100,
      solvedIssues:
        ((Number(minerStats.totalSolvedIssues) || 0) / maxSolvedIssues) * 100,
      uniqueRepos:
        ((Number(minerStats.uniqueReposCount) || 0) / maxUniqueRepos) * 100,
      totalIssues: (totalIssues / maxTotalIssues) * 100,
      avgRepoWeight: computeAvgRepoWeight(
        minerIssues,
        repos as Array<{ fullName?: string; weight?: string }>,
      ),
    };
  }, [minerStats, allMinerStats, minerIssues, repos]);

  if (!minerStats) return null;

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      {/* Header with Trust Badge */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid',
          borderColor: 'border.light',
          backgroundColor: 'surface.subtle',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="sectionTitle">Issue Discovery Activity</Typography>
        <TrustBadge
          credibility={issueStats.credibility}
          totalPRs={issueStats.solved + issueStats.closed}
        />
      </Box>

      {isLoadingIssues ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <Grid container>
          {/* Heatmap Section */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              p: 3,
              borderRight: { md: '1px solid' },
              borderRightColor: { md: 'border.light' },
              borderBottom: { xs: '1px solid', md: 'none' },
              borderBottomColor: { xs: 'border.light', md: 'transparent' },
            }}
          >
            <ContributionHeatmap
              data={contributionData}
              contributionsLast30Days={contributionsLast30Days}
              totalDaysShown={totalDaysShown}
              subtitle="issue activity in the last 30 days"
              footerText="* Activity based on issues solved in Gittensor-tracked repositories"
              bare
            />
          </Grid>

          {/* Issue Success Ratio */}
          <Grid
            item
            xs={12}
            md={3}
            sx={{
              p: 3,
              borderRight: { md: '1px solid' },
              borderRightColor: { md: 'border.light' },
              borderBottom: { xs: '1px solid', md: 'none' },
              borderBottomColor: { xs: 'border.light', md: 'transparent' },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <IssueCredibilityChart
              solved={issueStats.solved}
              open={issueStats.open}
              closed={issueStats.closed}
              credibility={issueStats.credibility}
            />
          </Grid>

          {/* Performance Radar */}
          <Grid
            item
            xs={12}
            md={3}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <IssuePerformanceRadar {...radarValues} />
          </Grid>
        </Grid>
      )}
    </Card>
  );
};

export default MinerIssueActivity;
