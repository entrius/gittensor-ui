/**
 * Dashboard page data composition hook.
 *
 * This module owns dashboard-specific data composition for the page layer.
 * It calls existing API hooks and converts raw datasets into UI-ready
 * dashboard models by delegating pure transformations to `dashboardData`.
 *
 * Keep pure domain/data builders out of this file.
 */
import { useMemo } from 'react';
import {
  useAllMiners,
  useAllPrs,
  useIssues,
  useLinesHistTrend,
  useMirrorDashboardIssues,
  useReposAndWeights,
} from '../../api';
import {
  type CommitLog,
  type DatasetState,
  type IssueBounty,
  type MinerEvaluation,
  type MirrorDashboardIssue,
  type Repository,
} from '../../api/models';
import {
  buildDashboardKpis,
  buildDashboardOverview,
  buildDashboardTrendData,
  buildFeaturedContributors,
  buildFeaturedWork,
  buildFeaturedDiscoveryContributors,
  GITTENSOR_START_MS,
  type TrendTimeRange,
} from './dashboardData';

type DashboardDatasets = {
  prs: DatasetState<CommitLog>;
  miners: DatasetState<MinerEvaluation>;
  issues: DatasetState<IssueBounty>;
  repos: DatasetState<Repository>;
  minerIssues: DatasetState<MirrorDashboardIssue>;
};

// Pinned once per module load — same `since` for every dashboard mount keeps
// the React Query cache key stable across renders and route remounts.
const DASHBOARD_ISSUES_SINCE_ISO = new Date(GITTENSOR_START_MS).toISOString();

export const useDashboardData = (range: TrendTimeRange) => {
  const prsQuery = useAllPrs();
  const minersQuery = useAllMiners();
  const issuesQuery = useIssues();
  const reposQuery = useReposAndWeights();
  const linesHistTrendQuery = useLinesHistTrend();

  // Single bulk mirror call replaces the previous per-miner fan-out.
  // The mirror is roster-blind; we filter to subnet authors below using the
  // gittensor miner roster.
  const dashboardIssuesQuery = useMirrorDashboardIssues(
    DASHBOARD_ISSUES_SINCE_ISO,
  );

  const minerGithubIdSet = useMemo(() => {
    const set = new Set<string>();
    (minersQuery.data ?? []).forEach((m) => {
      if (m.githubId) set.add(m.githubId);
    });
    return set;
  }, [minersQuery.data]);

  const minerIssuesData = useMemo<MirrorDashboardIssue[]>(
    () =>
      (dashboardIssuesQuery.data ?? []).filter(
        (issue) =>
          !!issue.author_github_id &&
          minerGithubIdSet.has(issue.author_github_id),
      ),
    [dashboardIssuesQuery.data, minerGithubIdSet],
  );
  const isMinerIssuesLoading = dashboardIssuesQuery.isLoading;
  const isMinerIssuesError = dashboardIssuesQuery.isError;

  const datasets: DashboardDatasets = {
    prs: {
      data: prsQuery.data ?? [],
      isLoading: prsQuery.isLoading,
      isError: prsQuery.isError,
    },
    miners: {
      data: minersQuery.data ?? [],
      isLoading: minersQuery.isLoading,
      isError: minersQuery.isError,
    },
    issues: {
      data: issuesQuery.data ?? [],
      isLoading: issuesQuery.isLoading,
      isError: issuesQuery.isError,
    },
    repos: {
      data: reposQuery.data ?? [],
      isLoading: reposQuery.isLoading,
      isError: reposQuery.isError,
    },
    minerIssues: {
      data: minerIssuesData,
      isLoading: isMinerIssuesLoading,
      isError: isMinerIssuesError,
    },
  };

  const overview = useMemo(
    () =>
      buildDashboardOverview(datasets.prs.data, datasets.miners.data, range),
    [datasets.miners.data, datasets.prs.data, range],
  );

  const trendData = useMemo(
    () =>
      buildDashboardTrendData(
        datasets.prs.data,
        datasets.minerIssues.data,
        range,
      ),
    [datasets.minerIssues.data, datasets.prs.data, range],
  );

  const featuredContributors = useMemo(
    () => buildFeaturedContributors(datasets.prs.data, datasets.miners.data),
    [datasets.miners.data, datasets.prs.data],
  );

  const featuredDiscoveryContributors = useMemo(
    () =>
      buildFeaturedDiscoveryContributors(
        datasets.prs.data,
        datasets.miners.data,
      ),
    [datasets.miners.data, datasets.prs.data],
  );

  const featuredWork = useMemo(
    () => buildFeaturedWork(datasets.prs.data, datasets.repos.data),
    [datasets.prs.data, datasets.repos.data],
  );

  const linesHistTrendData = useMemo(
    () => linesHistTrendQuery.data ?? [],
    [linesHistTrendQuery.data],
  );

  const kpis = useMemo(
    () =>
      buildDashboardKpis(
        datasets.prs.data,
        datasets.minerIssues.data,
        linesHistTrendData,
        range,
      ),
    [datasets.minerIssues.data, datasets.prs.data, linesHistTrendData, range],
  );

  const isFeaturedWorkLoading =
    datasets.prs.isLoading || datasets.repos.isLoading;

  return {
    datasets,
    kpis,
    overview,
    trendLabels: trendData.labels,
    trendSeries: trendData.series,
    featuredWork,
    isFeaturedWorkLoading,
    featuredContributors,
    featuredDiscoveryContributors,
    isLoading:
      datasets.prs.isLoading ||
      datasets.miners.isLoading ||
      datasets.issues.isLoading ||
      datasets.minerIssues.isLoading,
    isError:
      datasets.prs.isError ||
      datasets.miners.isError ||
      datasets.issues.isError ||
      datasets.minerIssues.isError,
  };
};

export default useDashboardData;
