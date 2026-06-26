// Repository API hooks - uses /repos endpoints
import { useApiMutation, useApiQuery } from './ApiUtils';
import { type RepositoryMaintainer, type RepositoryIssue } from './models';
import { type Repository, type RepositoryMiner } from './models/Dashboard';

/** One audit row from GET /repos/:repo/config-history (newest first). */
export type RepositoryConfigEdit = {
  id: string;
  editorLogin: string | null;
  editorGithubId: string;
  isAdmin: boolean;
  changedKeys: string[] | null;
  configBefore: Record<string, unknown> | null;
  configAfter: Record<string, unknown> | null;
  note: string | null;
  createdAt: string;
};

/** Body for a maintainer/admin hyperparameter edit (snake_case config keys). */
export type RepositoryConfigPatch = {
  config: Record<string, unknown>;
  note?: string;
};

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

/**
 * Hyperparameter edit history for a repository (audit trail), newest first.
 * @param repo - Full repository name (e.g., "opentensor/btcli")
 */
export const useRepositoryConfigHistory = (repo: string) =>
  useReposQuery<RepositoryConfigEdit[]>(
    'useRepositoryConfigHistory',
    `/${encodeURIComponent(repo)}/config-history`,
  );

// ---------------------------------------------------------------------------
// Authed writes (require a GitHub session — see AuthContext). On success they
// invalidate the affected repo reads so the UI reflects the change immediately.
// ---------------------------------------------------------------------------

/** Maintainer/admin edit of a repo's hyperparameters (PATCH /repos/:repo/config). */
export const useUpdateRepositoryConfig = (repo: string) =>
  useApiMutation<RepositoryConfigPatch, Repository>(
    (client, body) =>
      client
        .patch<Repository>(`/repos/${encodeURIComponent(repo)}/config`, body)
        .then((r) => r.data),
    {
      invalidateKeys: [['useRepositoryConfig'], ['useRepositoryConfigHistory']],
    },
  );

/** Admin: set a repo's emission_share (PATCH /repos/:repo/emission-share). */
export const useSetEmissionShare = (repo: string) =>
  useApiMutation<{ emissionShare: number }, Repository>(
    (client, body) =>
      client
        .patch<Repository>(
          `/repos/${encodeURIComponent(repo)}/emission-share`,
          body,
        )
        .then((r) => r.data),
    {
      invalidateKeys: [['useRepositoryConfig'], ['useRepositoryConfigHistory']],
    },
  );

/** Admin: register a new repository (POST /repos). */
export const useRegisterRepository = () =>
  useApiMutation<
    { fullName: string; config?: Record<string, unknown> },
    Repository
  >(
    (client, body) =>
      client.post<Repository>('/repos', body).then((r) => r.data),
    { invalidateKeys: [['useRepositoryConfig']] },
  );

/** Admin: remove a repository (DELETE /repos/:repo). */
export const useDeleteRepository = () =>
  useApiMutation<{ repo: string }, void>(
    (client, { repo }) =>
      client
        .delete<void>(`/repos/${encodeURIComponent(repo)}`)
        .then((r) => r.data),
    { invalidateKeys: [['useRepositoryConfig']] },
  );
