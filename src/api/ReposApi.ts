// Repository API hooks - uses /repos endpoints
import { useApiQuery } from './ApiUtils';
import { useReposAndWeights } from './DashboardApi';
import { type RepositoryMaintainer, type RepositoryIssue } from './models';
import { type Repository, type RepositoryMiner } from './models/Dashboard';

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
 * Get config for a specific repository (weight, additional branches, etc.)
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 */
export const useRepositoryConfig = (repo: string) =>
  useReposQuery<Repository>(
    'useRepositoryConfig',
    `/${encodeURIComponent(repo)}`,
  );

/**
 * Repository config resolved case-insensitively. `/repos/{name}` matches the
 * canonical casing only, while PR records may carry a lowercased repository
 * name — on a direct miss this falls back to matching the full repositories
 * list by lowercased name.
 */
export const useResolvedRepositoryConfig = (
  repo: string,
): Repository | null => {
  const direct = useRepositoryConfig(repo);
  const fallback = useReposAndWeights(direct.isError);
  if (direct.data) return direct.data;
  const lower = repo.toLowerCase();
  return fallback.data?.find((r) => r.fullName.toLowerCase() === lower) ?? null;
};

/**
 * Get maintainers (assignees) for a specific repository
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 */
export const useRepositoryMaintainers = (repo: string) =>
  useReposQuery<RepositoryMaintainer[]>(
    'useRepositoryMaintainers',
    `/${encodeURIComponent(repo)}/maintainers`,
  );

/**
 * Get all issues for a specific repository
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 */
export const useRepositoryIssues = (repo: string) =>
  useReposQuery<RepositoryIssue[]>(
    'useRepositoryIssues',
    `/${encodeURIComponent(repo)}/issues`,
  );

/**
 * Get the per-repository miner evaluations for a repository — one row per
 * active miner scored in this repo, with per-repo eligibility/credibility.
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 */
export const useRepositoryMiners = (repo: string) =>
  useReposQuery<RepositoryMiner[]>(
    'useRepositoryMiners',
    `/${encodeURIComponent(repo)}/miners`,
  );

/** One validator's submitted repo basket (u16 weights keyed by "owner/repo"). */
export type ValidatorBasket = {
  hotkey: string;
  stakeRao: string;
  basket: Record<string, number>;
};

/** Stake-weighted repo weight consensus snapshot from validator baskets. */
export type ValidatorBasketsResponse = {
  snapshotBlock: number | null;
  gatePassed: boolean;
  shares: Record<string, number>;
  eligibleStakeRao: string;
  validStakeRao: string;
  voterCount: number;
  baskets: ValidatorBasket[];
};

/**
 * Get the latest validator weight-basket consensus (GET /repos/validator-baskets).
 */
export const useValidatorBaskets = () =>
  useReposQuery<ValidatorBasketsResponse>(
    'useValidatorBaskets',
    '/validator-baskets',
  );
