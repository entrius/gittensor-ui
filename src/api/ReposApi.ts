// Repository API hooks - uses /repos endpoints
import { useApiQuery } from "./ApiUtils";
import { RepositoryMaintainer, RepositoryIssue } from "./models";
import { CommitLog } from "./models/Dashboard";

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

/**
 * Get maintainers (assignees) for a specific repository
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 */
export const useRepositoryMaintainers = (repo: string) =>
  useReposQuery<RepositoryMaintainer[]>(
    "useRepositoryMaintainers",
    `/${encodeURIComponent(repo)}/maintainers`,
  );

/**
 * Get all issues for a specific repository
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 * NOTE: Backend endpoint not yet implemented
 */
export const useRepositoryIssues = (repo: string) =>
  useReposQuery<RepositoryIssue[]>(
    "useRepositoryIssues",
    `/${encodeURIComponent(repo)}/issues`,
  );

/**
 * Get pull requests for a specific repository filtered by state
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 * @param state - Optional filter: "open", "closed", "merged"
 * NOTE: Backend endpoint not yet implemented
 */
export const useRepositoryPRs = (repo: string, state?: string) =>
  useReposQuery<CommitLog[]>(
    "useRepositoryPRs",
    `/${encodeURIComponent(repo)}/prs`,
    undefined,
    state ? { state } : undefined,
  );
