// Pull Request API hooks - uses /prs endpoints
import { useApiQuery } from "./ApiUtils";
import { CommitLog, PullRequestDetails } from "./models/Dashboard";

/**
 * Helper to create /prs endpoint queries
 */
const usePrsQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
) =>
  useApiQuery<TResponse, TSelect>(
    queryName,
    `/prs${url}`,
    refetchInterval,
    queryParams,
  );

/**
 * Get all pull requests across the network
 * Returns all PRs regardless of miner registration status
 */
export const useAllPrs = () => usePrsQuery<CommitLog[]>("useAllPrs", "");

/**
 * Get detailed information for a specific pull request
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 * @param number - Pull request number
 */
export const usePullRequestDetails = (repo: string, number: number) =>
  usePrsQuery<PullRequestDetails>(
    "usePullRequestDetails",
    "/details",
    undefined,
    { repo, number },
  );

/**
 * Get comments for a specific pull request
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 * @param number - Pull request number
 */
export const usePullRequestComments = (repo: string, number: number) =>
  usePrsQuery<any[]>("usePullRequestComments", "/comments", undefined, {
    repo,
    number,
  });
