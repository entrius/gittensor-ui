// Repository API hooks - uses /repos endpoints
import { useApiArrayQuery, useApiQuery } from './ApiUtils';
import { type RepositoryMaintainer, type RepositoryIssue } from './models';
import { type Repository } from './models/Dashboard';

/**
 * Helper to create /repos endpoint queries
 */
const useReposQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
) =>
  useApiQuery<TResponse, TSelect>(
    queryName,
    `/repos${url}`,
    refetchInterval,
    queryParams,
  );

const useReposArrayQuery = <TItem = void>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
) =>
  useApiArrayQuery<TItem>(
    queryName,
    `/repos${url}`,
    refetchInterval,
    queryParams,
  );

/**
 * Get config for a specific repository (weight, additional branches, etc.)
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 */
export const useRepositoryConfig = (repo: string) =>
  useReposQuery<Repository>(
    'useRepositoryConfig',
    `/${encodeURIComponent(repo)}`,
  );

/**
 * Get maintainers (assignees) for a specific repository
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 */
export const useRepositoryMaintainers = (repo: string) =>
  useReposArrayQuery<RepositoryMaintainer>(
    'useRepositoryMaintainers',
    `/${encodeURIComponent(repo)}/maintainers`,
  );

/**
 * Get all issues for a specific repository
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 */
export const useRepositoryIssues = (repo: string) =>
  useReposArrayQuery<RepositoryIssue>(
    'useRepositoryIssues',
    `/${encodeURIComponent(repo)}/issues`,
  );
