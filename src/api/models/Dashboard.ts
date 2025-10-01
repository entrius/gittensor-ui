export type RepoChanges = {
  repositoryFullName: string;
  commits: number;
  additions: number;
  deletions: number;
  linesChanged: number;
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
};
