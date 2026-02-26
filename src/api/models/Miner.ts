export interface RepositoryIssue {
  number: number;
  repositoryFullName: string;
  prNumber: number | null;
  title: string;
  createdAt: string | null;
  closedAt: string | null;
  state?: string;
  author?: string;
  url?: string;
}

export interface RepositoryMaintainer {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  type: string;
}
