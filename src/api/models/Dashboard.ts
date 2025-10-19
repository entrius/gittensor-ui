export type RepoChanges = {
  repositoryFullName: string;
  commits: number;
  additions: number;
  deletions: number;
  linesChanged: number;
};

export type Repository = {
  fullName: string;
  owner: string;
  name: string;
  weight: string; // bc float
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
  uniqueRepositories: number;
  totalLinesChanged: number;
  recentLinesChanged: number;
  totalIssues: number;
  totalCommits: number;
};
