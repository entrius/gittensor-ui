/**
 * Issues API hooks for v0 - no competitions.
 *
 * Simplified API without competition and ELO queries.
 */
import { useApiQuery } from "./ApiUtils";
import { IssueBounty, IssuesStats } from "./models/Issues";

/**
 * Fetch all issues with optional status filter.
 */
export const useIssues = (status?: string) =>
  useApiQuery<IssueBounty[]>(
    "useIssues",
    "/issues",
    undefined,
    status ? { status } : undefined,
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
