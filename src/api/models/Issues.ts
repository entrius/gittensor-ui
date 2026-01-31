/**
 * Issue bounty models for v0 - no competitions.
 *
 * Simplified interfaces without Competition, EloScore, EloHistory, EloStats.
 */

export interface IssueBounty {
  id: number;
  githubUrl: string;
  repositoryFullName: string;
  issueNumber: number;
  bountyAmount: string;
  targetBounty: string;
  status: "registered" | "active" | "completed" | "cancelled";
  solverHotkey: string | null;
  winningPrUrl: string | null;
  registeredAtBlock: number;
  createdAt: string;
  completedAt: string | null;
}

export interface IssuesStats {
  totalIssues: number;
  activeIssues: number;
  completedIssues: number;
  totalBountyPool: string;
  totalPayouts: string;
}
