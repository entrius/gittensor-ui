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
  score: string; // Backend returns as string
};
