import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { subDays, format } from 'date-fns';
import ReactECharts from 'echarts-for-react';
import {
  useMinerStats,
  useMinerPRs,
  useReposAndWeights,
  useAllMiners,
} from '../../api';
import ContributionHeatmap from '../ContributionHeatmap';
import DayPRsPanel from '../DayPRsPanel';
import { CHART_COLORS, STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import {
  aggregateIssueDiscoveryRepos,
  buildRepoWeightsMap,
  parseNumber,
} from '../../utils/ExplorerUtils';
import TrustBadge from './TrustBadge';
import CredibilityChart from './CredibilityChart';
import PerformanceRadar from './PerformanceRadar';

type ViewMode = 'prs' | 'issues';

interface MinerActivityProps {
  githubId: string;
  viewMode?: ViewMode;
}

// ---------------------------------------------------------------------------
// Issue-mode chart sub-components
// ---------------------------------------------------------------------------

const LegendItem: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      <Typography
        sx={{
          color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
          fontSize: '0.65rem',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          color,
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

const IssueCredibilityChart: React.FC<{
  solved: number;
  open: number;
  closed: number;
  credibility: number;
}> = ({ solved, open, closed, credibility }) => {
  const theme = useTheme();

  const chartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      title: {
        text: `${(credibility * 100).toFixed(0)}%`,
        subtext: 'Credibility',
        left: 'center',
        top: '38%',
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: 28,
          fontWeight: 'bold',
        },
        subtextStyle: {
          color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
          fontSize: 11,
          fontWeight: 500,
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: alpha(theme.palette.common.black, 0.9),
        borderColor: alpha(theme.palette.common.white, TEXT_OPACITY.ghost),
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
        },
      },
      series: [
        {
          name: 'Issue Status',
          type: 'pie',
          radius: ['58%', '72%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: 'transparent',
            borderWidth: 3,
          },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: false }, scale: true, scaleSize: 5 },
          labelLine: { show: false },
          data: [
            {
              value: solved,
              name: 'Solved',
              itemStyle: { color: CHART_COLORS.merged },
            },
            {
              value: open,
              name: 'Open',
              itemStyle: { color: CHART_COLORS.open },
            },
            {
              value: closed,
              name: 'Closed',
              itemStyle: { color: CHART_COLORS.closed },
            },
          ],
        },
      ],
    }),
    [solved, open, closed, credibility, theme],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography
        variant="monoSmall"
        sx={{
          color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
          mb: 0.75,
          textAlign: 'center',
        }}
      >
        Issue Solve Ratio
      </Typography>

      <Box sx={{ height: '190px', width: '100%', mb: 0.75 }}>
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <LegendItem label="Solved" value={solved} color={CHART_COLORS.merged} />
        <LegendItem label="Open" value={open} color={CHART_COLORS.open} />
        <LegendItem label="Closed" value={closed} color={CHART_COLORS.closed} />
      </Box>
    </Box>
  );
};

const IssuePerformanceRadar: React.FC<{
  credibility: number;
  solvedRatio: number;
  validRatio: number;
  volume: number;
  tokenScore: number;
  avgRepoWeight: number;
}> = ({
  credibility,
  solvedRatio,
  validRatio,
  volume,
  tokenScore,
  avgRepoWeight,
}) => {
  const theme = useTheme();

  const chartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      radar: {
        indicator: [
          { name: 'Credibility', max: 100 },
          { name: 'Solve\nRate', max: 100 },
          { name: 'Valid\nRate', max: 100 },
          { name: 'Volume', max: 100 },
          { name: 'Token\nScore', max: 100 },
          // Keep max 100 like other spokes — ECharts radar mixes poorly with max: 1.
          { name: 'Avg Repo\nWeight', max: 100 },
        ],
        center: ['50%', '50%'],
        radius: '50%',
        shape: 'circle',
        splitNumber: 5,
        axisName: {
          color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
          fontSize: 9,
          lineHeight: 12,
        },
        splitLine: {
          lineStyle: {
            color: Array(5).fill(
              alpha(theme.palette.common.white, TEXT_OPACITY.ghost * 0.25),
            ),
          },
        },
        splitArea: { show: false },
        axisLine: {
          lineStyle: {
            color: alpha(theme.palette.common.white, TEXT_OPACITY.ghost * 0.5),
          },
        },
      },
      series: [
        {
          type: 'radar',
          lineStyle: {
            width: 2,
            color: STATUS_COLORS.merged,
          },
          areaStyle: {
            color: `${STATUS_COLORS.merged}33`,
          },
          data: [
            {
              value: [
                credibility,
                solvedRatio,
                validRatio,
                volume,
                tokenScore,
                avgRepoWeight,
              ],
              name: 'Issue Stats',
              symbol: 'circle',
              symbolSize: 4,
              itemStyle: { color: STATUS_COLORS.merged },
            },
          ],
        },
      ],
    }),
    [
      credibility,
      solvedRatio,
      validRatio,
      volume,
      tokenScore,
      avgRepoWeight,
      theme,
    ],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography
        variant="monoSmall"
        sx={{
          color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
          mb: 2,
          textAlign: 'center',
        }}
      >
        Discovery Profile
      </Typography>
      <Box sx={{ height: '220px', width: '100%' }}>
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </Box>
    </Box>
  );
};

const MinerActivity: React.FC<MinerActivityProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  const isIssueMode = viewMode === 'issues';
  const { data: minerStats } = useMinerStats(githubId);
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();
  const { data: allMinerStats } = useAllMiners();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  useEffect(() => {
    setSelectedDate(todayStr);
  }, [githubId, viewMode, todayStr]);

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

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

  // PR-mode radar chart values (normalized to 100)
  const prRadarValues = useMemo(() => {
    if (isIssueMode) return null;
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
      ...allMinerStats.map((m) => m.totalNodesScored || 0),
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
    if (prs && repos && Array.isArray(repos) && repos.length > 0) {
      const repoWeights = buildRepoWeightsMap(repos);
      const mergedForWeight = prs.filter((pr) => pr.mergedAt);
      if (mergedForWeight.length > 0) {
        const totalWeight = mergedForWeight.reduce(
          (sum, pr) =>
            sum + (repoWeights.get((pr.repository || '').toLowerCase()) || 0),
          0,
        );
        const avgRaw = totalWeight / mergedForWeight.length;
        avgWeightVal = Math.min(Math.max(avgRaw, 0) * 100, 100);
      }
    }

    return {
      credibility: ((minerStats.credibility || 0) / maxCredibility) * 100,
      complexity: ((minerStats.totalNodesScored || 0) / maxComplexity) * 100,
      issuesSolved: ((minerStats.totalMergedPrs || 0) / maxMergedPrs) * 100,
      uniqueRepos: ((minerStats.uniqueReposCount || 0) / maxUniqueRepos) * 100,
      totalPRs: ((minerStats.totalPrs || 0) / maxTotalPrs) * 100,
      avgRepoWeight: avgWeightVal,
    };
  }, [minerStats, prs, repos, allMinerStats, isIssueMode]);

  // Issue-mode radar chart values
  const issueRadarValues = useMemo(() => {
    if (!isIssueMode) return null;
    if (!minerStats || !allMinerStats || allMinerStats.length === 0) {
      return {
        credibility: 0,
        solvedRatio: 0,
        validRatio: 0,
        volume: 0,
        tokenScore: 0,
        avgRepoWeight: 0,
      };
    }

    const issueCred = parseNumber(minerStats.issueCredibility);
    const solved = parseNumber(minerStats.totalSolvedIssues);
    const validSolved = parseNumber(minerStats.totalValidSolvedIssues);
    const issueTokenScore = parseNumber(minerStats.issueTokenScore);

    const maxSolved = Math.max(
      ...allMinerStats.map((m) => parseNumber(m.totalSolvedIssues)),
      1,
    );
    const maxTokenScore = Math.max(
      ...allMinerStats.map((m) => parseNumber(m.issueTokenScore)),
      1,
    );

    // Avg repo weight = mean of subnet Weight column on Issue Discovery Repositories
    // tab (issue-multiplier PRs only, one weight per distinct repo).
    let avgRepoWeight = 0;
    const repoWeights =
      repos && Array.isArray(repos) && repos.length > 0
        ? buildRepoWeightsMap(repos)
        : null;
    if (repoWeights && prs?.length) {
      const issueRepos = aggregateIssueDiscoveryRepos(prs, repoWeights);
      if (issueRepos.length > 0) {
        const avgRaw =
          issueRepos.reduce((sum, r) => sum + r.weight, 0) / issueRepos.length;
        avgRepoWeight = Math.min(Math.max(avgRaw, 0) * 100, 100);
      }
    }

    return {
      credibility: issueCred * 100,
      solvedRatio:
        solved > 0
          ? (solved / (solved + parseNumber(minerStats.totalClosedIssues))) *
            100
          : 0,
      validRatio: solved > 0 ? (validSolved / solved) * 100 : 0,
      volume: (solved / maxSolved) * 100,
      tokenScore: (issueTokenScore / maxTokenScore) * 100,
      avgRepoWeight,
    };
  }, [minerStats, allMinerStats, isIssueMode, repos, prs]);

  if (!minerStats) return null;

  const issueData = isIssueMode
    ? {
        solved: parseNumber(minerStats.totalSolvedIssues),
        openIssues: parseNumber(minerStats.totalOpenIssues),
        closedIssues: parseNumber(minerStats.totalClosedIssues),
        issueCred: parseNumber(minerStats.issueCredibility),
      }
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card sx={{ p: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2.5,
            borderBottom: '1px solid',
            borderColor: 'border.light',
            backgroundColor: 'surface.subtle',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: { xs: 1, sm: 0.75 },
          }}
        >
          <Typography variant="sectionTitle">
            {isIssueMode ? 'Issue Discovery Activity' : 'Developer Activity'}
          </Typography>
          <Box sx={{ alignSelf: { xs: 'stretch', sm: 'auto' }, minWidth: 0 }}>
            <TrustBadge
              credibility={
                isIssueMode
                  ? (issueData?.issueCred ?? 0)
                  : minerStats.credibility || 0
              }
              totalPRs={
                isIssueMode
                  ? (issueData?.solved ?? 0)
                  : minerStats.totalPrs || 0
              }
            />
          </Box>
        </Box>

        {isIssueMode ? (
          <Grid container>
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
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <IssueCredibilityChart
                solved={issueData!.solved}
                open={issueData!.openIssues}
                closed={issueData!.closedIssues}
                credibility={issueData!.issueCred}
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              {issueRadarValues && (
                <IssuePerformanceRadar {...issueRadarValues} />
              )}
            </Grid>
          </Grid>
        ) : isLoadingPRs ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={30} />
          </Box>
        ) : (
          <Grid container>
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
                subtitle="contribution(s) in the last 30 days"
                footerText="* Activity based on merged PRs in Gittensor-tracked repositories"
                bare
                selectedDate={selectedDate}
                onDayClick={handleDayClick}
              />
            </Grid>

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
              <CredibilityChart
                merged={minerStats.totalMergedPrs || 0}
                open={minerStats.totalOpenPrs || 0}
                closed={minerStats.totalClosedPrs || 0}
                credibility={minerStats.credibility || 0}
              />
            </Grid>

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
              {prRadarValues && <PerformanceRadar {...prRadarValues} />}
            </Grid>
          </Grid>
        )}
      </Card>
      {!isIssueMode && !isLoadingPRs && (
        <DayPRsPanel
          date={selectedDate}
          prs={prs ?? []}
          username={prs?.[0]?.author || githubId}
        />
      )}
    </Box>
  );
};

export default MinerActivity;
