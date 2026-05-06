import { alpha } from '@mui/material/styles';
import { STATUS_COLORS } from '../theme';
import type { RepositoryIssue } from '../api/models/Miner';

/** Prefer `state`, then `closedAt` (GitHub-style). */
export const isRepositoryIssueOpen = (issue: RepositoryIssue): boolean => {
  const s = issue.state?.toLowerCase();
  if (s === 'closed') return false;
  if (s === 'open') return true;
  return !issue.closedAt;
};

/**
 * API can return duplicate `repo:number` rows. React row keys must be unique
 * or the table body can show the wrong issue for a filter.
 */
export const dedupeRepositoryIssues = (
  list: RepositoryIssue[],
): RepositoryIssue[] => {
  const byKey = new Map<string, RepositoryIssue>();
  for (const issue of list) {
    const k = `${issue.repositoryFullName}:${issue.number}`;
    const existing = byKey.get(k);
    if (existing === undefined) {
      byKey.set(k, issue);
    } else {
      byKey.set(k, pickConsistentIssueDuplicate(existing, issue));
    }
  }
  return Array.from(byKey.values());
};

function pickConsistentIssueDuplicate(
  a: RepositoryIssue,
  b: RepositoryIssue,
): RepositoryIssue {
  const aOpen = isRepositoryIssueOpen(a);
  const bOpen = isRepositoryIssueOpen(b);
  if (aOpen === bOpen) return a;
  return aOpen ? b : a;
}

export interface IssueStatusMeta {
  bgColor: string;
  borderColor: string;
  color: string;
  text: string;
  tone: 'warning' | 'info' | 'merged' | 'error' | 'open';
}

export const getIssueStatusMeta = (status: string): IssueStatusMeta => {
  switch (status) {
    case 'registered':
      return {
        bgColor: alpha(STATUS_COLORS.warning, 0.15),
        borderColor: alpha(STATUS_COLORS.warning, 0.4),
        color: STATUS_COLORS.warning,
        text: 'Pending',
        tone: 'warning',
      };
    case 'active':
      return {
        bgColor: alpha(STATUS_COLORS.info, 0.15),
        borderColor: alpha(STATUS_COLORS.info, 0.4),
        color: STATUS_COLORS.info,
        text: 'Available',
        tone: 'info',
      };
    case 'completed':
      return {
        bgColor: alpha(STATUS_COLORS.merged, 0.15),
        borderColor: alpha(STATUS_COLORS.merged, 0.4),
        color: STATUS_COLORS.merged,
        text: 'Completed',
        tone: 'merged',
      };
    case 'cancelled':
      return {
        bgColor: alpha(STATUS_COLORS.error, 0.15),
        borderColor: alpha(STATUS_COLORS.error, 0.4),
        color: STATUS_COLORS.error,
        text: 'Cancelled',
        tone: 'error',
      };
    default:
      return {
        bgColor: alpha(STATUS_COLORS.open, 0.15),
        borderColor: alpha(STATUS_COLORS.open, 0.4),
        color: STATUS_COLORS.open,
        text: status,
        tone: 'open',
      };
  }
};

export const getBountyAmountColor = (
  status: string,
  mutedColor: string,
): string => {
  switch (status) {
    case 'active':
    case 'completed':
      return STATUS_COLORS.merged;
    case 'registered':
      return STATUS_COLORS.warning;
    default:
      return mutedColor;
  }
};
