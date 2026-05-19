export type RepoChanges = {
  repositoryFullName: string;
  commits: number;
  additions: number;
  deletions: number;
  linesChanged: number;
  emissionShare: string; // bc float
};

/**
 * Per-repo overrides for the eligibility / spam gate knobs. Mirrors
 * gittensor's `RepoEligibilityConfig`. Every field is optional — an absent
 * field falls back to the global default (see src/utils/repoConfig.ts).
 *
 * Keys are snake_case: das-gittensor only camelCases the top-level config
 * keys, nested objects like this one are passed through verbatim.
 */
export type RepoEligibilityConfig = {
  min_valid_merged_prs?: number;
  min_credibility?: number;
  min_token_score_for_base_score?: number;
  excessive_pr_penalty_base_threshold?: number;
  open_pr_threshold_token_score?: number;
  max_open_pr_threshold?: number;
  min_valid_solved_issues?: number;
  min_issue_credibility?: number;
  min_token_score_for_valid_issue?: number;
  open_issue_spam_base_threshold?: number;
  open_issue_spam_token_score_per_slot?: number;
  max_open_issue_threshold?: number;
};

/** Per-repo overrides for the time-decay curve (nested under `scoring`). */
type RepoTimeDecayConfig = {
  grace_period_hours?: number;
  sigmoid_midpoint_days?: number;
  sigmoid_steepness?: number;
  min_multiplier?: number;
};

/**
 * Per-repo overrides for the scoring knobs. Mirrors gittensor's
 * `RepoScoringConfig`. Snake_case keys, same passthrough caveat as
 * RepoEligibilityConfig.
 */
export type RepoScoringConfig = {
  pr_lookback_days?: number;
  open_pr_collateral_percent?: number;
  review_penalty_rate?: number;
  standard_issue_multiplier?: number;
  maintainer_issue_multiplier?: number;
  time_decay?: RepoTimeDecayConfig;
};

// Raw config blob from das-gittensor /dash/repos and /repos/:repo. Mirrors
// gittensor's master_repositories.json with shallow camelCase keys; nested
// object values (labelMultipliers, eligibility, scoring) keep their inner
// keys verbatim.
export type RepositoryConfig = {
  emissionShare?: number | string;
  issueDiscoveryShare?: number | string;
  maintainerCut?: number | string;
  fixedBaseScore?: number | string;
  defaultLabelMultiplier?: number;
  additionalAcceptableBranches?: string[] | null;
  mirrorEnabled?: boolean;
  trustedLabelPipeline?: boolean;
  labelMultipliers?: Record<string, number>;
  eligibility?: RepoEligibilityConfig;
  scoring?: RepoScoringConfig;
  [key: string]: unknown;
};

export type Repository = {
  fullName: string;
  owner: string;
  name: string;
  updatedAt: string;
  config: RepositoryConfig;
};

export type LanguageWeight = {
  extension: string;
  weight: string; // bc float
  language: string | null; // Canonical language name (e.g., "python" for .py, .pyi)
};

/**
 * Dashboard statistics
 *
 * API endpoint: GET /dash/stats
 */
/**
 * Cumulative lines committed for a date range.
 * API endpoint: GET /dash/lines/total
 */
export type LinesTotal = {
  linesCommitted: number;
};

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

// Mirror API (snake_case) — kept as-is to avoid a transform layer.
export type MinerIssue = {
  repo_full_name: string;
  issue_number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | string;
  state_reason?: string | null;
  author_github_id?: string | null;
  author_login?: string | null;
  author_association?: string | null;
  created_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
  last_edited_at?: string | null;
  is_transferred?: boolean;
  solved_by_pr?: number | null;
  solving_pr?: {
    pr_number: number;
    author_github_id?: string | null;
    state?: string;
    merged_at?: string | null;
    hours_since_merge?: number;
    edited_after_merge?: boolean;
    head_sha?: string;
    base_sha?: string;
    merge_base_sha?: string;
    labels?: Array<{ name: string }>;
    review_summary?: {
      maintainer_changes_requested_count?: number;
    };
    repo_full_name?: string;
  } | null;
  labels?: Array<{
    name: string;
    actor_github_id?: string | null;
    actor_association?: string | null;
  }>;
};

export type MinerIssuesResponse = {
  github_id: string;
  since: string;
  generated_at: string;
  issues: MinerIssue[];
};

export type LinkedIssue = {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | string;
  stateReason?: string | null;
  authorGithubId?: string | null;
  authorAssociation?: string | null;
  createdAt?: string | null;
  closedAt?: string | null;
  updatedAt?: string | null;
  isTransferred?: boolean;
  solvedByPr?: number | null;
  labels?: Array<{
    name: string;
    actorGithubId?: string | null;
    actorAssociation?: string | null;
  }>;
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
  issueMultiplier?: string;
  openPrSpamMultiplier?: string;
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

  // Linked issues (from /miners/{id}/pulls — issues this PR closes/references)
  linkedIssues?: LinkedIssue[];
};

/**
 * A single `miner_evaluations` row scoped to one repository.
 *
 * Eligibility is now per repository: `miner_evaluations` holds one row per
 * (uid, hotkey, githubId, repositoryFullName). These raw rows are returned
 * under `MinerEvaluation.repositories` by the single-miner endpoint.
 */
export type MinerRepositoryEvaluation = {
  id: number;
  uid: number;
  hotkey: string;
  githubId: string;
  repositoryFullName: string;
  failedReason: string | null;
  baseTotalScore: number;
  totalScore: number;
  totalCollateralScore: number;
  totalNodesScored: number;
  totalTokenScore: number;
  totalStructuralCount: number;
  totalStructuralScore: number;
  totalLeafCount: number;
  totalLeafScore: number;
  totalOpenPrs: number;
  totalClosedPrs: number;
  totalMergedPrs: number;
  totalPrs: number;
  uniqueReposCount: number;
  // Eligibility gate (per repository)
  isEligible: boolean;
  credibility: number;
  // Issue discovery scoring (per repository)
  issueDiscoveryScore: number;
  issueTokenScore: number;
  issueCredibility: number;
  isIssueEligible: boolean;
  totalSolvedIssues: number;
  totalValidSolvedIssues: number;
  totalClosedIssues: number;
  totalOpenIssues: number;
  // Timestamps
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * A per-repository miner evaluation row plus the resolved GitHub login — the
 * shape returned by `GET /repos/:repo/miners`. One row per active miner that
 * has a `miner_evaluations` row scoped to the repository.
 */
export type RepositoryMiner = MinerRepositoryEvaluation & {
  githubUsername: string | null;
  // Miner-wide daily earnings (NOT per-repo) — derived from the metagraph
  // incentive distribution; the same figure across all of a miner's repos.
  alphaPerDay?: number;
  taoPerDay?: number;
  usdPerDay?: number;
};

/**
 * Miner-level evaluation summary.
 *
 * Since `miner_evaluations` is now one-row-per-repository, both miner
 * endpoints aggregate the per-repo rows:
 * - `GET /miners` (leaderboard) SUMs additive score columns, takes BOOL_OR
 *   for eligibility and MAX for credibility, and exposes per-repo eligible
 *   counts. It does NOT return `id` or the `repositories` breakdown.
 * - `GET /miners/:githubId` returns the same rollup PLUS the raw per-repo
 *   rows under `repositories`.
 */
export type MinerEvaluation = {
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
  // Eligibility gate — rolled up across repos: `isEligible` is true when the
  // miner is eligible in at least one repo; `eligibleRepoCount` is how many.
  isEligible?: boolean;
  credibility?: number;
  eligibleRepoCount?: number;
  // Issue discovery scoring (rolled up across repos, same semantics)
  issueDiscoveryScore?: number;
  issueTokenScore?: number;
  issueCredibility?: number;
  isIssueEligible?: boolean;
  issueEligibleRepoCount?: number;
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
  // Per-repository breakdown — only present on the single-miner endpoint
  // (`GET /miners/:githubId`), absent from the leaderboard (`GET /miners`).
  repositories?: MinerRepositoryEvaluation[];

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
  baseScore: string; // float returned as string
  issueMultiplier: string; // float returned as string
  openPrSpamMultiplier: string; // float returned as string
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
