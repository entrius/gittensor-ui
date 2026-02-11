/**
 * Issues API - For issue bounties.
 */
import { useApiQuery } from "./ApiUtils";
import {
  IssueBounty,
  IssueDetails,
  IssueSubmission,
  IssuesStats,
  RepoBountySummary,
} from "./models/Issues";

/**
 * Fetch all issues with optional status and repository filter.
 */
export const useIssues = (status?: string, repository?: string) => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (repository) params.repository = repository;
  return useApiQuery<IssueBounty[]>(
    "useIssues",
    "/issues",
    undefined,
    Object.keys(params).length > 0 ? params : undefined,
  );
};

/**
 * Fetch all bounties for a specific repository.
 */
export const useRepoIssues = (repoFullName: string) =>
  useApiQuery<IssueBounty[]>(
    "useRepoIssues",
    "/issues",
    undefined,
    { repository: repoFullName },
    !!repoFullName,
  );

/**
 * Fetch issue statistics.
 */
export const useIssuesStats = () =>
  useApiQuery<IssuesStats>("useIssuesStats", "/issues/stats");

/**
 * Fetch a single issue by ID.
 */
export const useIssue = (id: number) =>
  useApiQuery<IssueBounty>(
    "useIssue",
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
    "useIssueDetails",
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
    "useIssueSubmissions",
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
    "useRepoBountySummary",
    `/issues/repo/${encodeURIComponent(repoFullName)}/summary`,
    undefined,
    undefined,
    !!repoFullName,
  );
