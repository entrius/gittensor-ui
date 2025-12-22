export type RepoChanges = {
  repositoryFullName: string;
  commits: number;
  additions: number;
  deletions: number;
  linesChanged: number;
  weight: string; // bc float
  inactiveAt: string;
};

export type Repository = {
  fullName: string;
  owner: string;
  name: string;
  weight: string; // bc float
  inactiveAt?: string;
};

export type LanguageWeight = {
  extension: string;
  weight: string; // bc float
};

export type CommitsTrend = {
  date: string;
  linesCommitted: number | string; // API returns string, needs conversion
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
        symbol: string;
        name: string;
        market_cap: number;
        volume_24h: number;
        percent_change_1h: number;
        percent_change_24h: number;
        percent_change_7d: number;
        percent_change_30d: number;
        last_updated: string;
      };
      lastUpdated: string;
      nextUpdate: string;
    };
    alpha: {
      data: {
        price: number;
        symbol: string;
        name: string;
        netuid: number;
        market_cap: number;
        liquidity: number;
        price_change_1_hour: number;
        price_change_1_day: number;
        price_change_1_week: number;
        price_change_1_month: number;
        tao_volume_24_hr: number;
        alpha_volume_24_hr: number;
        timestamp: string;
      };
      lastUpdated: string;
      nextUpdate: string;
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
  githubId: string; // Numeric GitHub ID
  score: string; // Backend returns as string
  baseScore?: string; // Backend returns as string
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
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
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
