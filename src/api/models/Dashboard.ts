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
};
