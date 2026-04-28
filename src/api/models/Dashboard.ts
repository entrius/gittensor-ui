export type RepoChanges = {
  repositoryFullName: string;
  commits: number;
  additions: number;
  deletions: number;
  linesChanged: number;
  weight: string; // bc float
  inactiveAt: string | null;
};

export type Repository = {
  fullName: string;
  owner: string;
  name: string;
  weight: string; // bc float
  additionalAcceptableBranches?: string[] | null;
  inactiveAt?: string | null;
};

export type LanguageWeight = {
  extension: string;
  weight: string; // bc float
  language: string | null; // Canonical language name (e.g., "python" for .py, .pyi)
};

export type CommitsTrend = {
  date: string;
  linesCommitted: number | string; // API returns string, needs conversion
};

// Mirror API (snake_case) — kept as-is to avoid a transform layer.
export type MinerIssue = {
  repo_full_name: string;
  issue_number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | string;
  state_reason?: string | null;
  author_github_id?: string | null;
  author_login?: string | null;
  created_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
  is_transferred?: boolean;
  solved_by_pr?: number | null;
  solving_pr?: {
    pr_number: number;
    state?: string;
    merged_at?: string | null;
    repo_full_name?: string;
  } | null;
  labels?: Array<{ name: string }>;
};

export type MinerIssuesResponse = {
  github_id: string;
  since: string;
  generated_at: string;
  issues: MinerIssue[];
};

/**
 * Dashboard statistics
 *
 * API endpoint: GET /dash/stats
 */
export type Stats = {
  uniqueRepositories: string | number;
  totalLinesChanged: string | number;
  recentLinesChanged: string | number;
  totalIssues: number;
  totalCommits: string | number;
  prices?: {
    tao: {
      data: {
        price: number;
        marketCap: number;
        volume24h: number;
        percentChange24h: number;
        percentChange7d: number;
        lastUpdated: string;
        metadata: Record<string, unknown>;
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
        metadata: Record<string, unknown>;
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
  mergedAt: string | null;
  closedAt: string | null;
  prCreatedAt: string;
  prState: string;
  collateralScore?: string;
  author: string;
  githubId?: string; // Numeric GitHub ID - only present in /miners endpoints, not /dash/commits
  score: string; // Backend returns as string
  baseScore?: string; // Backend returns as string

  // Score multiplier fields (from /miners/{id}/prs endpoint)
  repoWeightMultiplier?: string;
  issueMultiplier?: string;
  openPrSpamMultiplier?: string;
  pioneerDividend?: number;
  pioneerRank?: number;
  timeDecayMultiplier?: string;
  credibilityMultiplier?: string;

  // Token scoring fields
  totalNodesScored?: number;
  tokenScore?: number;
  structuralCount?: number;
  structuralScore?: number;
  leafCount?: number;
  leafScore?: number;

  // Review quality
  reviewQualityMultiplier?: string;

  // Label scoring
  labelMultiplier?: number;
  label?: string;
  codeDensity?: number;

  // Payout predictions
  potentialScore?: number;
  predictedAlphaPerDay?: number | null;
  predictedTaoPerDay?: number | null;
  predictedUsdPerDay?: number | null;
};

export type MinerEvaluation = {
  id: number;
  uid: number;
  hotkey: string;
  githubId: string;
  githubUsername?: string;
  failedReason: string;
  baseTotalScore: number;
  totalScore: number;
  totalNodesScored: number;
  totalOpenPrs: number;
  totalPrs: number;
  uniqueReposCount: number;
  totalCollateralScore?: number;
  totalClosedPrs?: number;
  totalMergedPrs?: number;
  // Eligibility gate
  isEligible?: boolean;
  credibility?: number;
  // Issue discovery scoring
  issueDiscoveryScore?: number;
  issueTokenScore?: number;
  issueCredibility?: number;
  isIssueEligible?: boolean;
  totalSolvedIssues?: number;
  totalValidSolvedIssues?: number;
  totalClosedIssues?: number;
  totalOpenIssues?: number;
  // Total token scoring fields
  totalTokenScore?: number;
  totalStructuralCount?: number;
  totalStructuralScore?: number;
  totalLeafCount?: number;
  totalLeafScore?: number;
  // Timestamps
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
  // Additional stats
  totalAdditions?: number;
  totalDeletions?: number;

  alphaPerDay?: number;
  taoPerDay?: number;
  usdPerDay?: number;
  lifetimeAlpha?: number;
  lifetimeTao?: number;
  lifetimeUsd?: number;
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
  pioneerDividend: number;
  pioneerRank: number;
  timeDecayMultiplier: string; // float returned as string
  credibilityMultiplier: string; // float returned as string
  reviewQualityMultiplier?: string; // float returned as string
  labelMultiplier: number;
  label: string | null;
  codeDensity: number;
  earnedScore: string; // float returned as string
  collateralScore: string; // float returned as string
  additions: number;
  deletions: number;
  commits: number;
  // Token scoring fields
  totalNodesScored: number;
  tokenScore: string;
  structuralCount: number;
  structuralScore: number;
  leafCount: number;
  leafScore: number;
  mergedByLogin: string | null;
  description: string | null;
  lastEditedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Predicted daily payouts based on potential score
  potentialScore?: number;
  predictedAlphaPerDay?: number | null;
  predictedTaoPerDay?: number | null;
  predictedUsdPerDay?: number | null;
};

export type PullRequestComment = {
  id: number;
  user: {
    login: string;
    avatarUrl: string;
    htmlUrl: string;
  };
  body: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  authorAssociation: string;
};
