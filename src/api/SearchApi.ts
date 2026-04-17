/**
 * Search data hook.
 * Composes cached miners, repositories, PRs, and issues datasets in place of a dedicated search endpoint.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from './ApiUtils';
import { getReposQueryKey } from './DashboardApi';
import { getIssuesQueryKey } from './IssuesApi';
import { getAllMinersQueryKey } from './MinerApi';
import { getAllPrsQueryKey } from './PrsApi';
import { type DatasetState } from './models';
import { type IssueBounty } from './models/Issues';
import {
  type CommitLog,
  type MinerEvaluation,
  type Repository,
} from './models/Dashboard';

type SearchDatasets = {
  miners: DatasetState<MinerEvaluation>;
  repositories: DatasetState<Repository>;
  prs: DatasetState<CommitLog>;
  issues: DatasetState<IssueBounty>;
};

const isDatasetLoading = <T>(
  shouldFetch: boolean,
  cachedData: T[] | undefined,
  isLoading: boolean,
) => shouldFetch && cachedData === undefined && isLoading;

const useCachedSearchDataset = <T>(
  queryName: string,
  url: string,
  cachedData: T[] | undefined,
  shouldFetch: boolean,
): DatasetState<T> => {
  const datasetQuery = useApiQuery<T[]>(
    queryName,
    url,
    undefined,
    undefined,
    shouldFetch && cachedData === undefined,
  );

  return {
    data: Array.isArray(datasetQuery.data)
      ? datasetQuery.data
      : Array.isArray(cachedData)
        ? cachedData
        : [],
    isLoading: isDatasetLoading(
      shouldFetch,
      cachedData,
      datasetQuery.isLoading,
    ),
    isError: datasetQuery.isError,
  };
};

/**
 * Load raw search datasets from cache-backed API sources.
 * @param shouldFetch When true, fetches datasets that are not already cached.
 */
export const useSearchDatasets = (shouldFetch: boolean): SearchDatasets => {
  const queryClient = useQueryClient();
  const [minersQueryName, minersUrl] = getAllMinersQueryKey();
  const [reposQueryName, reposUrl] = getReposQueryKey();
  const [prsQueryName, prsUrl] = getAllPrsQueryKey();
  const [issuesQueryName, issuesUrl] = getIssuesQueryKey();

  const cachedMiners = queryClient.getQueryData<MinerEvaluation[]>(
    getAllMinersQueryKey(),
  );
  const cachedRepositories =
    queryClient.getQueryData<Repository[]>(getReposQueryKey());
  const cachedPrs = queryClient.getQueryData<CommitLog[]>(getAllPrsQueryKey());
  const cachedIssues =
    queryClient.getQueryData<IssueBounty[]>(getIssuesQueryKey());

  const minerDataset = useCachedSearchDataset<MinerEvaluation>(
    minersQueryName,
    minersUrl,
    cachedMiners,
    shouldFetch,
  );
  const repositoryDataset = useCachedSearchDataset<Repository>(
    reposQueryName,
    reposUrl,
    cachedRepositories,
    shouldFetch,
  );
  const prDataset = useCachedSearchDataset<CommitLog>(
    prsQueryName,
    prsUrl,
    cachedPrs,
    shouldFetch,
  );
  const issueDataset = useCachedSearchDataset<IssueBounty>(
    issuesQueryName,
    issuesUrl,
    cachedIssues,
    shouldFetch,
  );

  return {
    miners: minerDataset,
    repositories: repositoryDataset,
    prs: prDataset,
    issues: issueDataset,
  };
};
