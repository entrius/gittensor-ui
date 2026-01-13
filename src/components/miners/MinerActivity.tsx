import React, { useMemo } from 'react';
import { Box, Card, Typography, Grid, CircularProgress } from '@mui/material';
import { subDays, format } from 'date-fns';
import {
  useMinerStats,
  useMinerPRs,
  useReposAndWeights,
  useAllMiners,
} from '../../api';
import { ContributionHeatmap } from '../dashboard';
import TrustBadge from './TrustBadge';
import CredibilityChart from './CredibilityChart';
import PerformanceRadar from './PerformanceRadar';

interface MinerActivityProps {
  githubId: string;
}

const MinerActivity: React.FC<MinerActivityProps> = ({ githubId }) => {
  const { data: minerStats } = useMinerStats(githubId);
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();
  const { data: allMinerStats } = useAllMiners();

  // Calculate contribution heatmap data
  const { contributionData, contributionsLast30Days, totalDaysShown } =
    useMemo(() => {
      if (!prs || prs.length === 0) {
        return {
          contributionData: [],
          contributionsLast30Days: 0,
          totalDaysShown: 0,
        };
      }

      const today = new Date();
      let earliestDate = today;

      prs.forEach((pr) => {
        if (pr.mergedAt) {
          const d = new Date(pr.mergedAt);
          if (d < earliestDate) earliestDate = d;
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

      prs.forEach((pr) => {
        if (!pr.mergedAt) return;
        const date = new Date(pr.mergedAt);
        if (isNaN(date.getTime())) return;

        const dateStr = format(date, 'yyyy-MM-dd');
        if (dataMap.has(dateStr)) {
          dataMap.set(dateStr, (dataMap.get(dateStr) || 0) + 1);
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
    }, [prs]);

  // Calculate radar chart values (normalized to 100)
  const radarValues = useMemo(() => {
    if (!minerStats || !allMinerStats || allMinerStats.length === 0) {
      return {
        credibility: 0,
        complexity: 0,
        issuesSolved: 0,
        uniqueRepos: 0,
        totalPRs: 0,
        avgRepoWeight: 0,
      };
    }

    const maxCredibility = Math.max(
      ...allMinerStats.map((m) => m.credibility || 0),
      0.01,
    );
    const maxComplexity = Math.max(
      ...allMinerStats.map((m) => m.totalLinesChanged || 0),
      1,
    );
    const maxMergedPrs = Math.max(
      ...allMinerStats.map((m) => m.totalMergedPrs || 0),
      1,
    );
    const maxUniqueRepos = Math.max(
      ...allMinerStats.map((m) => m.uniqueReposCount || 0),
      1,
    );
    const maxTotalPrs = Math.max(
      ...allMinerStats.map((m) => m.totalPrs || 0),
      1,
    );

    let avgWeightVal = 0;
    if (prs && prs.length > 0 && repos && Array.isArray(repos)) {
      const repoWeights = new Map<string, number>();
      repos.forEach((repo) => {
        if (repo?.fullName) {
          repoWeights.set(repo.fullName, parseFloat(repo.weight || '0'));
        }
      });
      const totalWeight = prs.reduce(
        (sum, pr) => sum + (repoWeights.get(pr.repository) || 0),
        0,
      );
      avgWeightVal = Math.min(totalWeight / prs.length, 100);
    }

    return {
      credibility: ((minerStats.credibility || 0) / maxCredibility) * 100,
      complexity: ((minerStats.totalLinesChanged || 0) / maxComplexity) * 100,
      issuesSolved: ((minerStats.totalMergedPrs || 0) / maxMergedPrs) * 100,
      uniqueRepos: ((minerStats.uniqueReposCount || 0) / maxUniqueRepos) * 100,
      totalPRs: ((minerStats.totalPrs || 0) / maxTotalPrs) * 100,
      avgRepoWeight: avgWeightVal,
    };
  }, [minerStats, prs, repos, allMinerStats]);

  if (!minerStats) return null;

  return (
    <Card sx={{ p: 0, overflow: 'hidden', mb: 3 }}>
      {/* Header with Trust Badge */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="sectionTitle">Developer Activity</Typography>
        <TrustBadge
          credibility={minerStats.credibility || 0}
          totalPRs={minerStats.totalPrs || 0}
        />
      </Box>

      {isLoadingPRs ? (
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
              borderRight: { md: '1px solid rgba(255, 255, 255, 0.1)' },
              borderBottom: {
                xs: '1px solid rgba(255, 255, 255, 0.1)',
                md: 'none',
              },
            }}
          >
            <ContributionHeatmap
              data={contributionData}
              contributionsLast30Days={contributionsLast30Days}
              totalDaysShown={totalDaysShown}
              subtitle="contributions in the last 30 days"
              footerText="* Activity based on merged PRs in Gittensor-tracked repositories"
              bare
            />
          </Grid>

          {/* PR Success Ratio */}
          <Grid
            item
            xs={12}
            md={3}
            sx={{
              p: 3,
              borderRight: { md: '1px solid rgba(255, 255, 255, 0.1)' },
              borderBottom: {
                xs: '1px solid rgba(255, 255, 255, 0.1)',
                md: 'none',
              },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <CredibilityChart
              merged={minerStats.totalMergedPrs || 0}
              open={minerStats.totalOpenPrs || 0}
              closed={minerStats.totalClosedPrs || 0}
              credibility={minerStats.credibility || 0}
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
            <PerformanceRadar {...radarValues} />
          </Grid>
        </Grid>
      )}
    </Card>
  );
};

export default MinerActivity;
