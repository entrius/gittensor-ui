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
  language: string | null; // Canonical language name (e.g., "python" for .py, .pyi)
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
  mergedAt: string | null;
  prCreatedAt: string;
  prState: string;
  collateralScore?: string;
  author: string;
  githubId?: string; // Numeric GitHub ID - only present in /miners endpoints, not /dash/commits
  score: string; // Backend returns as string
  baseScore?: string; // Backend returns as string
  tier: string | null; // Bronze, Silver, Gold - from joined repositories table (null if repo not registered)

  // Token scoring fields
  totalNodesScored?: number;
  rawCredibility?: number;
  credibilityScalar?: number;
  tokenScore?: number;
  structuralCount?: number;
  structuralScore?: number;
  leafCount?: number;
  leafScore?: number;

  // TODO: these values do not come in the /dash/commits endpoint, refactor to perhaps make a new model to include these attributes
  // Payout predictions (from /miners/all/prs endpoint)
  // Note: dollar values are null for open PRs, only calculated for merged PRs
  potentialScore?: number;
  predictedAlphaPerDay?: number | null;
  predictedTaoPerDay?: number | null;
  predictedUsdPerDay?: number | null;

  // Low value PR indicator
  lowValuePr?: boolean;
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
  qualifiedUniqueReposCount?: number;
  // Tier system properties
  currentTier?: string;
  totalCollateralScore?: number;
  totalClosedPrs?: number;
  totalMergedPrs?: number;
  // Total token scoring fields
  totalTokenScore?: number;
  totalStructuralCount?: number;
  totalStructuralScore?: number;
  totalLeafCount?: number;
  totalLeafScore?: number;
  // Bronze tier
  bronzeMergedPrs?: number;
  bronzeClosedPrs?: number;
  bronzeTotalPrs?: number;
  bronzeCollateralScore?: number;
  bronzeScore?: number;
  bronzeTokenScore?: number;
  bronzeStructuralCount?: number;
  bronzeStructuralScore?: number;
  bronzeLeafCount?: number;
  bronzeLeafScore?: number;
  // Silver tier
  silverMergedPrs?: number;
  silverClosedPrs?: number;
  silverTotalPrs?: number;
  silverCollateralScore?: number;
  silverScore?: number;
  silverTokenScore?: number;
  silverStructuralCount?: number;
  silverStructuralScore?: number;
  silverLeafCount?: number;
  silverLeafScore?: number;
  // Gold tier
  goldMergedPrs?: number;
  goldClosedPrs?: number;
  goldTotalPrs?: number;
  goldCollateralScore?: number;
  goldScore?: number;
  goldTokenScore?: number;
  goldStructuralCount?: number;
  goldStructuralScore?: number;
  goldLeafCount?: number;
  goldLeafScore?: number;
  // Credibility metrics (PR success rates as decimals 0-1)
  credibility?: number;
  bronzeCredibility?: number;
  silverCredibility?: number;
  goldCredibility?: number;
  // Unique repo contribution counts per tier
  bronzeUniqueRepos?: number;
  bronzeQualifiedUniqueRepos?: number;
  silverUniqueRepos?: number;
  silverQualifiedUniqueRepos?: number;
  goldUniqueRepos?: number;
  goldQualifiedUniqueRepos?: number;
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
  repositoryUniquenessMultiplier: string; // float returned as string
  timeDecayMultiplier: string; // float returned as string
  gittensorTagMultiplier: string; // float returned as string
  credibilityMultiplier: string; // float returned as string
  earnedScore: string; // float returned as string
  collateralScore: string; // float returned as string
  additions: number;
  deletions: number;
  commits: number;
  // Token scoring fields
  totalNodesScored: number;
  rawCredibility: number;
  credibilityScalar: number;
  tokenScore: string;
  structuralCount: number;
  structuralScore: number;
  leafCount: number;
  leafScore: number;
  gittensorTagged: boolean;
  mergedByLogin: string | null;
  description: string | null;
  lastEditedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tier: string; // Bronze, Silver, Gold
  // Predicted daily payouts based on potential score
  // Note: dollar values are null for open PRs, only calculated for merged PRs
  potentialScore?: number;
  predictedAlphaPerDay?: number | null;
  predictedTaoPerDay?: number | null;
  predictedUsdPerDay?: number | null;
  // Low value PR indicator
  lowValuePr?: boolean;
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
