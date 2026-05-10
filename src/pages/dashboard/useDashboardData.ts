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
  useMinersIssues,
  useReposAndWeights,
} from '../../api';
import {
  type CommitLog,
  type DatasetState,
  type IssueBounty,
  type MinerEvaluation,
  type Repository,
} from '../../api/models';
import {
  buildDashboardKpis,
  buildDashboardOverview,
  buildDashboardTrendData,
  buildFeaturedContributors,
  buildFeaturedWork,
  buildFeaturedDiscoveryContributors,
  type TrendTimeRange,
} from './dashboardData';

type DashboardDatasets = {
  prs: DatasetState<CommitLog>;
  miners: DatasetState<MinerEvaluation>;
  issues: DatasetState<IssueBounty>;
  repos: DatasetState<Repository>;
};

export const useDashboardData = (range: TrendTimeRange) => {
  const prsQuery = useAllPrs();
  const minersQuery = useAllMiners();
  const issuesQuery = useIssues();
  const reposQuery = useReposAndWeights();

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
  };

  const overview = useMemo(
    () =>
      buildDashboardOverview(datasets.prs.data, datasets.miners.data, range),
    [datasets.miners.data, datasets.prs.data, range],
  );

  const trendData = useMemo(
    () =>
      buildDashboardTrendData(datasets.prs.data, datasets.issues.data, range),
    [datasets.issues.data, datasets.prs.data, range],
  );

  const featuredContributors = useMemo(
    () => buildFeaturedContributors(datasets.prs.data, datasets.miners.data),
    [datasets.miners.data, datasets.prs.data],
  );

  // Step 1: pick featured discoverers (repos populated from mirror API below)
  const discovererCandidates = useMemo(
    () => buildFeaturedDiscoveryContributors(datasets.miners.data),
    [datasets.miners.data],
  );

  // Step 2: fan-out per-miner issues from mirror API to get real issue repos
  const discovererIds = useMemo(
    () => discovererCandidates.map((d) => d.githubId),
    [discovererCandidates],
  );
  const discovererIssueQueries = useMinersIssues(
    discovererIds,
    discovererIds.length > 0,
  );

  // Step 3: attach repos from MinerIssue.repo_full_name (authoritative source)
  const featuredDiscoveryContributors = useMemo(() => {
    return discovererCandidates.map((d, i) => {
      const minerIssues = discovererIssueQueries[i]?.data ?? [];
      if (minerIssues.length === 0) return d;
      const repoCounts = new Map<string, number>();
      for (const issue of minerIssues) {
        if (issue.repo_full_name) {
          repoCounts.set(
            issue.repo_full_name,
            (repoCounts.get(issue.repo_full_name) ?? 0) + 1,
          );
        }
      }
      const repos = [...repoCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([repo]) => repo);
      return { ...d, repos };
    });
  }, [discovererCandidates, discovererIssueQueries]);

  const featuredWork = useMemo(
    () => buildFeaturedWork(datasets.prs.data, datasets.repos.data),
    [datasets.prs.data, datasets.repos.data],
  );

  const kpis = useMemo(
    () => buildDashboardKpis(datasets.prs.data, datasets.issues.data, range),
    [datasets.issues.data, datasets.prs.data, range],
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
      datasets.issues.isLoading,
    isError:
      datasets.prs.isError ||
      datasets.miners.isError ||
      datasets.issues.isError,
  };
};

export default useDashboardData;
