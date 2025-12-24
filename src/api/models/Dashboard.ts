export type RepoChanges = {
  repositoryFullName: string;
  commits: number;
  additions: number;
  deletions: number;
  linesChanged: number;
  weight: string; // bc float
  tier: string; // Bronze, Silver, Gold
  inactiveAt: string | null;
};

export type Repository = {
  fullName: string;
  owner: string;
  name: string;
  weight: string; // bc float
  tier: string; // Bronze, Silver, Gold
  additionalAcceptableBranches?: string[] | null;
  inactiveAt?: string | null;
};

export type LanguageWeight = {
  extension: string;
  weight: string; // bc float
};

export type CommitsTrend = {
  date: string;
  linesCommitted: number | string; // API returns string, needs conversion
};

/**
 * Dashboard statistics
 *
 * API endpoint: GET /dash/stats
 * Optional query parameter: tier (Bronze, Silver, or Gold) - filters all stats to specific repository tier
 *
 * Examples:
 * - GET /dash/stats - returns overall stats
 * - GET /dash/stats?tier=Bronze - returns stats filtered to Bronze tier repositories only
 * - GET /dash/stats?tier=Silver - returns stats filtered to Silver tier repositories only
 * - GET /dash/stats?tier=Gold - returns stats filtered to Gold tier repositories only
 */
export type Stats = {
  uniqueRepositories: string | number;
  totalLinesChanged: string | number;
  recentLinesChanged: string | number;
  totalIssues: number;
  totalCommits: string | number;
  tier?: string; // Returned when tier filter is applied
  prices?: {
    tao: {
      data: {
        price: number;
        marketCap: number;
        volume24h: number;
        percentChange24h: number;
        percentChange7d: number;
        lastUpdated: string;
        metadata: any;
      } | null;
      lastUpdated: string | null;
    };
    alpha: {
      data: {
        price: number;
        marketCap: number;
        volume24h: number;
        percentChange24h: number;
        percentChange7d: number;
        lastUpdated: string;
        metadata: any;
      } | null;
      lastUpdated: string | null;
    };
  };
};

export type CommitLog = {
  pullRequestNumber: number;
  hotkey: string;
  pullRequestTitle: string;
  additions: number;
  deletions: number;
  commitCount: number;
  repository: string;
  mergedAt: string;
  author: string;
  githubId?: string; // Numeric GitHub ID - only present in /miners endpoints, not /dash/commits
  score: string; // Backend returns as string
  baseScore?: string; // Backend returns as string
  tier: string; // Bronze, Silver, Gold - from joined repositories table
};

export type MinerEvaluation = {
  id: number;
  uid: number;
  hotkey: string;
  githubId: string;
  failedReason: string;
  baseTotalScore: number;
  totalScore: number;
  totalLinesChanged: number;
  totalOpenPrs: number;
  totalPrs: number;
  uniqueReposCount: number;
  // Tier system properties
  currentTier?: string;
  totalCollateralScore?: number;
  totalClosedPrs?: number;
  totalMergedPrs?: number;
  // Bronze tier
  bronzeMergedPrs?: number;
  bronzeClosedPrs?: number;
  bronzeTotalPrs?: number;
  bronzeCollateralScore?: number;
  bronzeScore?: number;
  // Silver tier
  silverMergedPrs?: number;
  silverClosedPrs?: number;
  silverTotalPrs?: number;
  silverCollateralScore?: number;
  silverScore?: number;
  // Gold tier
  goldMergedPrs?: number;
  goldClosedPrs?: number;
  goldTotalPrs?: number;
  goldCollateralScore?: number;
  goldScore?: number;
  // Credibility metrics (PR success rates as decimals 0-1)
  credibility?: number;
  bronzeCredibility?: number;
  silverCredibility?: number;
  goldCredibility?: number;
  // Timestamps
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
  // Additional stats
  totalAdditions?: number;
  totalDeletions?: number;
};

export type GithubMinerData = {
  // Core Identity
  githubId: string;
  login: string;
  name: string;
  avatarUrl: string;
  htmlUrl: string;
  type: string;
  // Account Metadata
  bio: string;
  company: string;
  location: string;
  blog: string;
  email: string;
  twitterUsername: string;
  hireable: boolean;
  // Timestamps
  githubCreatedAt: string;
  githubUpdatedAt: string;
  // Stats / Activity
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  // Tracking
  lastFetchedAt: string;
  updatedAt: string;
};

export type PullRequestDetails = {
  number: number;
  repositoryFullName: string;
  uid: number;
  hotkey: string;
  githubId: string;
  title: string;
  authorLogin: string;
  mergedAt: string | null;
  prCreatedAt: string;
  prState: string;
  repoWeightMultiplier: string; // float returned as string
  baseScore: string; // float returned as string
  issueMultiplier: string; // float returned as string
  openPrSpamMultiplier: string; // float returned as string
  repositoryUniquenessMultiplier: string; // float returned as string
  timeDecayMultiplier: string; // float returned as string
  gittensorTagMultiplier: string; // float returned as string
  credibilityMultiplier: string; // float returned as string
  earnedScore: string; // float returned as string
  collateralScore: string; // float returned as string
  additions: number;
  deletions: number;
  commits: number;
  totalLinesScored: number;
  gittensorTagged: boolean;
  mergedByLogin: string | null;
  description: string | null;
  lastEditedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tier: string; // Bronze, Silver, Gold
};
