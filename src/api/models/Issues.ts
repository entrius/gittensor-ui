/**
 * Issue bounty models
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
  authorGithubId: string | null;
  prState: string;
  prCreatedAt: string;
  mergedAt: string | null;
  tokenScore: number;
  commits: number;
  hotkey: string | null;
  isWinner: boolean;
}
