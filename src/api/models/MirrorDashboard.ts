// Mirror API (snake_case) — slim issue rows returned by
// `/api/v1/dashboard/issues`. The mirror is intentionally roster-blind: every
// row is returned regardless of author. The dashboard blends with the
// gittensor miner roster client-side to filter to subnet authors.

export interface MirrorDashboardIssue {
  repo_full_name: string;
  issue_number: number;
  author_github_id: string | null;
  created_at: string;
  closed_at: string | null;
  state: 'OPEN' | 'CLOSED' | string;
  state_reason: string | null;
  solving_pr: { merged_at: string } | null;
}

export interface MirrorDashboardIssuesResponse {
  since: string;
  generated_at: string;
  issues: MirrorDashboardIssue[];
}
