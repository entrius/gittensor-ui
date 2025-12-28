// Miner-specific hooks - optimized to use new /miners endpoints
import { useApiQuery } from "./ApiUtils";
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
    `/api/miners${url}`,
    refetchInterval,
    queryParams,
  );

/**
 * Get all pull requests for a specific miner
 * Uses the optimized /miners/:githubId/prs endpoint
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
 * Uses the optimized /miners/all/prs endpoint
 */
export const useAllMinerData = () =>
  useMinersQuery<CommitLog[]>("useAllMinerData", "/all/prs");

/**
 * Get all miners' pre-computed stats for leaderboards
 * Much faster than aggregating PRs - uses the MinerEvaluations table
 * Max 256 miners in the subnet
 */
export const useAllMinerStats = () =>
  useMinersQuery<MinerEvaluation[]>(
    "useAllMinerStats",
    "/stats/all",
    undefined,
  );

/**
 * Get GitHub profile data for a specific miner
 * Uses the /miners/:githubId/github endpoint
 */
export const useMinerGithubData = (githubId: string) =>
  useMinersQuery<GithubMinerData>("useMinerGithubData", `/${githubId}/github`);

/**
 * Get detailed information for a specific pull request
 * Uses the /miners/pr endpoint with repo and number query parameters
 */
export const usePullRequestDetails = (repo: string, number: number) =>
  useMinersQuery<PullRequestDetails>(
    "usePullRequestDetails",
    "/pr",
    undefined,
    { repo, number },
  );

/**
 * Get pull requests for a specific repository filtered by state
 * Uses the /miners/repo/prs endpoint
 */
export const useRepositoryPRs = (repo: string, state?: string) =>
  useMinersQuery<CommitLog[]>(
    "useRepositoryPRs",
    "/repo/prs",
    undefined,
    { repo, state }
  );

/**
 * Get all issues for a specific repository
 * Uses the /miners/repo/issues endpoint
 */
export const useRepositoryIssues = (repo: string) =>
  useMinersQuery<RepositoryIssue[]>(
    "useRepositoryIssues",
    "/repo/issues",
    undefined,
    { repo }
  );

export interface RepositoryIssue {
  issueNumber: number;
  repositoryFullName: string;
  linkedPrNumber: number | null;
  title: string;
  createdAt: string | null;
  closedAt: string | null;
  state?: string;
  author?: string;
  url?: string;
}
