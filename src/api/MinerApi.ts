// Miner-specific hooks - optimized to use new /miners endpoints
import { useApiQuery } from "./ApiUtils";
import { RepositoryMaintainer, RepositoryIssue } from "./models";
import {
  CommitLog,
  GithubMinerData,
  MinerEvaluation,
  PullRequestDetails,
} from "./models/Dashboard";

export const useMinersQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
) =>
  useApiQuery<TResponse, TSelect>(
    queryName,
    `/miners${url}`,
    refetchInterval,
    queryParams,
  );

/**
 * Get all pull requests for a specific miner
 */
export const useMinerPRs = (githubId: string) =>
  useMinersQuery<CommitLog[]>("useMinerPRs", `/${githubId}/prs`);

/**
 * Get pre-computed stats for a specific miner (totalScore, baseTotalScore, totalPRs, etc.)
 * Much faster than aggregating PRs - uses the MinerEvaluations table
 */
export const useMinerStats = (githubId: string) =>
  useMinersQuery<MinerEvaluation>("useMinerStats", `/${githubId}/stats`);

/**
 * Get all miners' PR data
 */
export const useAllMinerData = () =>
  useMinersQuery<CommitLog[]>("useAllMinerData", "/all/prs");

/**
 * Get all miners' pre-computed stats for leaderboards
 * Much faster than aggregating PRs - uses the MinerEvaluations table
 */
export const useAllMinerStats = () =>
  useMinersQuery<MinerEvaluation[]>(
    "useAllMinerStats",
    "/stats/all",
    undefined,
  );

/**
 * Get GitHub profile data for a specific miner
 */
export const useMinerGithubData = (githubId: string) =>
  useMinersQuery<GithubMinerData>("useMinerGithubData", `/${githubId}/github`);

/**
 * Get detailed information for a specific pull request
 */
export const usePullRequestDetails = (repo: string, number: number) =>
  useMinersQuery<PullRequestDetails>(
    "usePullRequestDetails",
    "/pr",
    undefined,
    { repo, number },
  );

/**
 * Get comments for a specific pull request
 */
export const usePullRequestComments = (repo: string, number: number) =>
  useMinersQuery<any[]>("usePullRequestComments", "/pr/comments", undefined, {
    repo,
    number,
  });

/**
 * Get pull requests for a specific repository filtered by state
 */
export const useRepositoryPRs = (repo: string, state?: string) =>
  useMinersQuery<CommitLog[]>("useRepositoryPRs", "/repo/prs", undefined, {
    repo,
    state,
  });

/**
 * Get all issues for a specific repository
 */
export const useRepositoryIssues = (repo: string) =>
  useMinersQuery<RepositoryIssue[]>(
    "useRepositoryIssues",
    "/repo/issues",
    undefined,
    { repo },
  );

export const useRepositoryMaintainers = (repo: string) =>
  useMinersQuery<RepositoryMaintainer[]>(
    "useRepositoryMaintainers",
    "/repo/maintainers",
    undefined,
    { repo },
  );
