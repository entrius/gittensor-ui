export interface RepositoryIssue {
  number: number;
  repositoryFullName: string;
  prNumber: number | null;
  title: string;
  createdAt: string | null;
  closedAt: string | null;
  state?: string;
  author?: string;
  /** When present, preferred over `author` for matching the reporter. */
  authorLogin?: string | null;
  url?: string;
}

export interface RepositoryMaintainer {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  type: string;
}
