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
import { useAllMiners, useAllPrs, useIssues } from '../../api';
import {
  type CommitLog,
  type DatasetState,
  type IssueBounty,
  type MinerEvaluation,
} from '../../api/models';
import {
  buildDashboardKpis,
  buildDashboardOverview,
  buildDashboardTrendData,
  buildFeaturedContributors,
  type TrendTimeRange,
} from './dashboardData';

type DashboardDatasets = {
  prs: DatasetState<CommitLog>;
  miners: DatasetState<MinerEvaluation>;
  issues: DatasetState<IssueBounty>;
};

export const useDashboardData = (range: TrendTimeRange) => {
  const prsQuery = useAllPrs();
  const minersQuery = useAllMiners();
  const issuesQuery = useIssues();

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
  };

  const overview = useMemo(
    () => buildDashboardOverview(datasets.prs.data, datasets.issues.data, range),
    [datasets.issues.data, datasets.prs.data, range],
  );

  const trendData = useMemo(
    () => buildDashboardTrendData(datasets.prs.data, datasets.issues.data, range),
    [datasets.issues.data, datasets.prs.data, range],
  );

  const featuredContributors = useMemo(
    () => buildFeaturedContributors(datasets.prs.data, datasets.miners.data),
    [datasets.miners.data, datasets.prs.data],
  );

  const kpis = useMemo(
    () => buildDashboardKpis(datasets.prs.data, datasets.issues.data, range),
    [datasets.issues.data, datasets.prs.data, range],
  );

  return {
    datasets,
    kpis,
    overview,
    trendLabels: trendData.labels,
    trendSeries: trendData.series,
    featuredContributors,
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
