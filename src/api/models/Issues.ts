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
  payoutAmount: string | null;
  winningPrNumber: number | null;
  registeredAtBlock: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface IssuesStats {
  totalIssues: number;
  activeIssues: number;
  completedIssues: number;
  totalBountyPool: string;
  totalPayouts: string;
}

export interface IssueDetails extends IssueBounty {
  title: string | null;
  body: string | null;
  state: string | null;
  authorLogin: string | null;
  labels: string[];
}

export interface IssueSubmission {
  number: number;
  repositoryFullName: string;
  title: string;
  authorLogin: string;
  prState: string;
  prCreatedAt: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  commits: number;
  earnedScore: number | null;
  hotkey: string | null;
  isWinner: boolean;
}
