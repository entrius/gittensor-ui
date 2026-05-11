/**
 * Issues API - For issue bounties.
 */
import { useApiQuery } from './ApiUtils';
import {
  IssueBounty,
  IssueDetails,
  IssueSubmission,
  IssuesStats,
  RepoBountySummary,
} from './models/Issues';

/**
 * Fetch all issues with optional status and repository filter.
 */
export const useIssues = (status?: string, repository?: string) => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (repository) params.repository = repository;
  return useApiQuery<IssueBounty[]>(
    'useIssues',
    '/issues',
    undefined,
    Object.keys(params).length > 0 ? params : undefined,
  );
};

// Shared cache key for the issues dataset.
export const getIssuesQueryKey = (status?: string, repository?: string) =>
  [
    'useIssues',
    '/issues',
    status || repository ? { status, repository } : undefined,
  ] as const;

/**
 * Fetch all bounties for a specific repository.
 */
export const useRepoIssues = (repoFullName: string) =>
  useApiQuery<IssueBounty[]>(
    'useRepoIssues',
    '/issues',
    undefined,
    { repository: repoFullName },
    !!repoFullName,
  );

/**
 * Fetch issue statistics.
 */
export const useIssuesStats = () =>
  useApiQuery<IssuesStats>('useIssuesStats', '/issues/stats');

/**
 * Fetch issue details with GitHub data.
 */
export const useIssueDetails = (id: number) =>
  useApiQuery<IssueDetails>(
    'useIssueDetails',
    `/issues/${id}/details`,
    undefined,
    undefined,
    !!id,
  );

// Shared cache key for an issue's submissions. Used by `useIssueSubmissions`
// and any fan-out consumers (e.g. the bounty-hunters aggregator) so they share
// the same React Query entry instead of re-fetching the same payload.
export const getIssueSubmissionsQueryKey = (id: number) =>
  ['useIssueSubmissions', `/issues/${id}/submissions`, undefined] as const;

/**
 * Fetch PR submissions for an issue.
 */
export const useIssueSubmissions = (id: number) =>
  useApiQuery<IssueSubmission[]>(
    'useIssueSubmissions',
    `/issues/${id}/submissions`,
    undefined,
    undefined,
    !!id,
  );

/**
 * Fetch bounty summary for a specific repository.
 */
export const useRepoBountySummary = (repoFullName: string) =>
  useApiQuery<RepoBountySummary>(
    'useRepoBountySummary',
    `/issues/repo/${encodeURIComponent(repoFullName)}/summary`,
    undefined,
    undefined,
    !!repoFullName,
  );
