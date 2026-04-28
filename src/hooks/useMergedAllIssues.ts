import { useMemo } from 'react';
import { useIssues } from '../api';
import type { IssueBounty } from '../api/models/Issues';

/**
 * Same merged issue list as IssuesPage (active + registered + history),
 * for reuse on Watchlist and elsewhere.
 */
export function useMergedAllIssues(): {
  issues: IssueBounty[];
  isLoading: boolean;
} {
  const activeIssuesQuery = useIssues('active');
  const registeredIssuesQuery = useIssues('registered');
  const historyIssuesQuery = useIssues('completed,cancelled');

  const issues = useMemo(() => {
    const seen = new Set<number>();
    const result: IssueBounty[] = [];
    for (const issue of [
      ...(activeIssuesQuery.data || []),
      ...(registeredIssuesQuery.data || []),
      ...(historyIssuesQuery.data || []),
    ]) {
      if (!seen.has(issue.id)) {
        seen.add(issue.id);
        result.push(issue);
      }
    }
    return result;
  }, [
    activeIssuesQuery.data,
    registeredIssuesQuery.data,
    historyIssuesQuery.data,
  ]);

  const isLoading =
    activeIssuesQuery.isLoading &&
    registeredIssuesQuery.isLoading &&
    historyIssuesQuery.isLoading;

  return { issues, isLoading };
}
