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
  useIssues,
} from '../../api';
import ContributionHeatmap from '../ContributionHeatmap';
import DayPRsPanel from '../DayPRsPanel';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import {
  echartsRadarChrome,
  echartsTransparentBackground,
} from '../../utils/echarts/gittensorChartTheme';
import {
  aggregateIssueDiscoveryByRepository,
  buildRepoWeightsMap,
  parseNumber,
  type IssueRepoStats,
} from '../../utils/ExplorerUtils';
import TrustBadge from './TrustBadge';
import MergeOutcomeBar from './MergeOutcomeBar';
import PerformanceRadar from './PerformanceRadar';
import { ChartEmptyPanel } from '../common/ChartEmptyPanel';

type ViewMode = 'prs' | 'issues';

interface MinerActivityProps {
  githubId: string;
  viewMode?: ViewMode;
  /** Heatmap window from the dashboard's 1D/7D/30D range switch. */
  rangeDays?: number;
}

// ---------------------------------------------------------------------------
// Issue-mode chart sub-components
// ---------------------------------------------------------------------------

const IssuePerformanceRadar: React.FC<{
  credibility: number;
  solvedRatio: number;
  validRatio: number;
  volume: number;
  tokenScore: number;
  avgRepoWeight: number;
  isEmpty: boolean;
}> = ({
  credibility,
  solvedRatio,
  validRatio,
  volume,
  tokenScore,
  avgRepoWeight,
  isEmpty,
}) => {
  const theme = useTheme();

  const chartOption = useMemo(
    () => ({
      ...echartsTransparentBackground(),
      radar: {
        ...echartsRadarChrome(theme),
        indicator: [
          { name: 'Credibility', max: 100 },
          { name: 'Solve\nrate', max: 100 },
          { name: 'Valid\nrate', max: 100 },
          { name: 'Solve\nvolume', max: 100 },
          { name: 'Token\nscore', max: 100 },
          // Keep max 100 like other spokes — ECharts radar mixes poorly with max: 1.
          { name: 'Repo\npayout', max: 100 },
        ],
        center: ['50%', '50%'],
        radius: '50%',
        shape: 'circle',
        splitNumber: 5,
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
          mb: 0.5,
          textAlign: 'center',
        }}
      >
        Discovery Profile
      </Typography>
      <Typography
        sx={{
          color: alpha(theme.palette.common.white, TEXT_OPACITY.faint),
          fontSize: '0.62rem',
          mb: 1.5,
          textAlign: 'center',
        }}
      >
        Each axis scaled 0–100 vs the network's best
      </Typography>
      <ChartEmptyPanel
        empty={isEmpty}
        minHeight={220}
        title="No activity yet"
        hint="Your discovery profile appears after you participate in issue bounties."
      >
        <Box sx={{ height: '220px', width: '100%' }}>
          <ReactECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </Box>
      </ChartEmptyPanel>
    </Box>
  );
};

const MinerActivity: React.FC<MinerActivityProps> = ({
  githubId,
  viewMode = 'prs',
  rangeDays,
}) => {
  const isIssueMode = viewMode === 'issues';
  const { data: minerStats } = useMinerStats(githubId);
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();
  const { data: issues } = useIssues();
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
      // Clamp the visible window to the selected range (1D/7D/30D); without a
      // range, show the miner's full history as before.
      const daysToShow = Math.min(
        Math.max(daysDiff, 1),
        rangeDays ?? Number.MAX_SAFE_INTEGER,
      );

      const dataMap = new Map<string, number>();
      for (let i = daysToShow; i >= 0; i--) {
        dataMap.set(format(subDays(today, i), 'yyyy-MM-dd'), 0);
      }

      const windowDays = rangeDays ?? 30;
      let last30Count = 0;
      const windowStart = subDays(today, windowDays);

      prs.forEach((pr) => {
        if (!pr.mergedAt) return;
        const date = new Date(pr.mergedAt);
        if (isNaN(date.getTime())) return;

        const dateStr = format(date, 'yyyy-MM-dd');
        if (dataMap.has(dateStr)) {
          dataMap.set(dateStr, (dataMap.get(dateStr) || 0) + 1);
        }
        if (date >= windowStart) last30Count++;
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
    }, [prs, rangeDays]);

  // PR-mode radar chart values (normalized to 100)
  const prRadarValues = useMemo(() => {
    if (isIssueMode) return null;
    if (!minerStats || !allMinerStats || allMinerStats.length === 0) {
      return {
        credibility: 0,
        complexity: 0,
        mergedPrs: 0,
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
      mergedPrs: ((minerStats.totalMergedPrs || 0) / maxMergedPrs) * 100,
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

    // Avg repo weight = mean subnet weight on Issue Discovery Repositories tab
    // (completed bounty solves — same basis as MinerRepositoriesTable issue mode).
    let avgRepoWeight = 0;
    const repoWeights =
      repos && Array.isArray(repos) && repos.length > 0
        ? buildRepoWeightsMap(repos)
        : null;
    if (repoWeights && prs?.length && issues?.length) {
      const issueRepos = aggregateIssueDiscoveryByRepository(
        prs,
        issues,
        repoWeights,
      );
      if (issueRepos.length > 0) {
        const avgRaw =
          issueRepos.reduce(
            (sum: number, r: IssueRepoStats) => sum + r.weight,
            0,
          ) / issueRepos.length;
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
  }, [minerStats, allMinerStats, isIssueMode, repos, prs, issues]);

  if (!minerStats) return null;

  const issueData = isIssueMode
    ? {
        solved: parseNumber(minerStats.totalSolvedIssues),
        openIssues: parseNumber(minerStats.totalOpenIssues),
        closedIssues: parseNumber(minerStats.totalClosedIssues),
        issueCred: parseNumber(minerStats.issueCredibility),
      }
    : null;

  const issueActivityEmpty = Boolean(
    issueData &&
    issueData.solved + issueData.openIssues + issueData.closedIssues === 0,
  );

  const prActivityEmpty = (minerStats.totalPrs || 0) === 0;

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
              <MergeOutcomeBar
                merged={issueData!.solved}
                open={issueData!.openIssues}
                closed={issueData!.closedIssues}
                credibility={issueData!.issueCred}
                title="Issue outcomes"
                mergedLabel="Solved"
                rateLabel="Credibility"
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
                <IssuePerformanceRadar
                  {...issueRadarValues}
                  isEmpty={issueActivityEmpty}
                />
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
                subtitle={`contribution(s) in the last ${rangeDays ?? 30} days`}
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
              <MergeOutcomeBar
                merged={minerStats.totalMergedPrs || 0}
                open={minerStats.totalOpenPrs || 0}
                closed={minerStats.totalClosedPrs || 0}
                credibility={minerStats.credibility || 0}
                title="PR outcomes"
                mergedLabel="Merged"
                rateLabel="Credibility"
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
              {prRadarValues && (
                <PerformanceRadar
                  {...prRadarValues}
                  isActivityEmpty={prActivityEmpty}
                />
              )}
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
