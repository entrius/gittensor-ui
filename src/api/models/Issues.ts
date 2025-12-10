/**
 * Issues API data models
 */

export interface IssueStatus {
  OPEN: "OPEN";
  IN_PROGRESS: "IN_PROGRESS";
  SOLVED: "SOLVED";
  CANCELLED: "CANCELLED";
}

export type IssueStatusType = keyof IssueStatus;

export interface Issue {
  id: string;
  githubUrl: string;
  title: string;
  description: string;
  repositoryName: string;
  repositoryOwner: string;
  bountyAlpha?: number; // in ALPHA tokens
  bountyUsd: number; // in USD
  depositorAddress: string;
  issueCreatedTimestamp?: number; // Milliseconds when issue was created on GitHub
  registrationTimestamp: number; // Milliseconds when registered on Gittensor
  status: IssueStatusType;
  solverAddress?: string;
  resolutionTimestamp?: number;
  registrationTxHash?: string;
  resolutionTxHash?: string;
  labels: string[];
  commentsCount?: number;
  language?: string;
  timeToSolve?: number; // in seconds
  lastBountyUpdate?: number; // Unix timestamp
  solutionRequiredBy?: number; // Unix timestamp for deadline
  openPullRequests?: OpenPullRequest[];
  // Bounty breakdown
  initialBountyAlpha?: number; // Initial deposit in ALPHA
  initialBountyUsd?: number; // Initial deposit in USD
  contributionsAlpha?: number; // Contributions in ALPHA
  contributionsUsd?: number; // Contributions in USD
  currentSolutionAmount?: number; // Current solution amount
  solutionPrUrl?: string; // URL to the PR that solved the issue
  solutionPrNumber?: number; // PR number that solved the issue
}

export interface OpenPullRequest {
  number: number;
  url: string;
  author: string;
  createdAt: number;
  title: string;
}

export interface IssueStats {
  totalBountyPoolAlpha: number; // Total ALPHA in all active bounties
  totalBountyPoolUsd: number;
  activeIssuesCount: number;
  solvedIssuesCount: number;
  totalIssuesCount: number;
  totalPaidOutAlpha: number; // Total ALPHA paid to solvers
  totalPaidOutUsd: number;
  alphaPrice: number;
  successRate: number;
}

export interface BountyHistoryPoint {
  timestamp: number;
  totalBountyPool: number; // Total active bounty at this time
  totalBountyPoolUsd: number;
  changeType: "REGISTRATION" | "INFLATION" | "RESOLUTION";
  issueId?: string;
  amount?: number;
}

export interface FeaturedIssue {
  id: string;
  title: string;
  repositoryName: string;
  repositoryOwner: string;
  bountyAlpha: number;
  bountyUsd: number;
  ageInDays: number;
  githubUrl: string;
  language?: string;
  labels: string[];
}

export interface IssueListItem {
  id: string;
  title: string;
  repositoryName: string;
  repositoryOwner: string;
  bountyAlpha: number;
  bountyUsd: number;
  status: IssueStatusType;
  registrationTimestamp: number;
  resolutionTimestamp?: number;
  githubUrl: string;
  solutionPrUrl?: string; // PR that solved the issue
  solutionPrNumber?: number; // PR number
  language?: string;
  labels: string[];
  timeToSolve?: number; // in seconds (for solved issues)
}
