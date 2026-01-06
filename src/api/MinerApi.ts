// Miner API hooks - uses /miners endpoints
import { useApiQuery } from "./ApiUtils";
import {
  GithubMinerData,
  MinerEvaluation,
  CommitLog,
} from "./models/Dashboard";

/**
 * Helper to create /miners endpoint queries
 */
const useMinersQuery = <TResponse = void, TSelect = TResponse>(
  queryName: string,
  url: string,
  refetchInterval?: number,
  queryParams?: Record<string, string | number | undefined>,
  options?: { enabled?: boolean },
) =>
  useApiQuery<TResponse, TSelect>(
    queryName,
    `/miners${url}`,
    refetchInterval,
    queryParams,
    options,
  );

/**
 * Get all active miners with their pre-computed stats
 * Only includes miners currently registered on the subnet (in current_miners table)
 * Ideal for leaderboards
 */
export const useAllMiners = () =>
  useMinersQuery<MinerEvaluation[]>("useAllMiners", "");

/**
 * Get pre-computed stats for a specific miner
 * @param githubId - Numeric GitHub ID (e.g., "583231"), NOT username
 */
export const useMinerStats = (githubId: string) =>
  useMinersQuery<MinerEvaluation>("useMinerStats", `/${githubId}`);

/**
 * Get all pull requests for a specific miner
 * @param githubId - Numeric GitHub ID (e.g., "583231"), NOT username
 */
export const useMinerPRs = (githubId: string) =>
  useMinersQuery<CommitLog[]>("useMinerPRs", `/${githubId}/prs`);

/**
 * Get GitHub profile data for a specific miner
 * @param githubId - Numeric GitHub ID (e.g., "583231"), NOT username
 */
export const useMinerGithubData = (githubId: string) =>
  useMinersQuery<GithubMinerData>("useMinerGithubData", `/${githubId}/github`);
