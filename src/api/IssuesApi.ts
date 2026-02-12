/**
 * Issues API - For issue bounties.
 */
import { useApiQuery } from './ApiUtils';
import {
  IssueBounty,
  IssueDetails,
  IssueSubmission,
  IssuesStats,
} from './models/Issues';

/**
 * Fetch all issues with optional status filter.
 */
export const useIssues = (status?: string) =>
  useApiQuery<IssueBounty[]>(
    'useIssues',
    '/issues',
    undefined,
    status ? { status } : undefined,
  );

/**
 * Fetch issue statistics.
 */
export const useIssuesStats = () =>
  useApiQuery<IssuesStats>('useIssuesStats', '/issues/stats');

/**
 * Fetch a single issue by ID.
 */
export const useIssue = (id: number) =>
  useApiQuery<IssueBounty>(
    'useIssue',
    `/issues/${id}`,
    undefined,
    undefined,
    !!id,
  );

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
