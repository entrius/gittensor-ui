import type { RepositoryIssue } from '../api';

/**
 * Collapse duplicate `RepositoryIssue` entries — the API can return the same
 * issue more than once (multiple miners independently surfaced it), and
 * downstream UI uses the issue identity for both rendering and counts.
 *
 * Identity = `${repositoryFullName}#${number}`. The first occurrence wins;
 * the input order is preserved among the surviving rows.
 */
export const dedupeRepositoryIssues = (
  issues: readonly RepositoryIssue[] | undefined | null,
): RepositoryIssue[] => {
  if (!issues || issues.length === 0) return [];
  const seen = new Map<string, RepositoryIssue>();
  for (const issue of issues) {
    const key = `${issue.repositoryFullName}#${issue.number}`;
    if (!seen.has(key)) seen.set(key, issue);
  }
  return Array.from(seen.values());
};
