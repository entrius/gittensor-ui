// Mirror dashboard API — single-call replacements for the dashboard's
// per-miner fan-out against `/miners/<id>/issues`. The mirror endpoints
// return roster-blind data; callers blend with the gittensor miner roster
// client-side to filter to subnet authors.
import { useMirrorApiQuery } from './ApiUtils';
import {
  type MirrorDashboardIssue,
  type MirrorDashboardIssuesResponse,
} from './models';

/**
 * Slim issue rows for dashboard trend aggregation.
 *
 * One bulk call replaces the N per-miner calls previously fanned out via
 * `useMinersIssues`. Returns every issue created on or after `since`, plus
 * every CLOSED issue closed on or after `since`. Authorship is preserved
 * via `author_github_id` so the dashboard can filter to subnet miners.
 */
export const useMirrorDashboardIssues = (since: string, enabled?: boolean) =>
  useMirrorApiQuery<MirrorDashboardIssuesResponse, MirrorDashboardIssue[]>(
    'useMirrorDashboardIssues',
    `/dashboard/issues?since=${encodeURIComponent(since)}`,
    {
      enabled,
      select: (data) => data?.issues ?? [],
    },
  );
