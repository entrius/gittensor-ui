import { type CommitLog } from '../api';
import {
  isClosedUnmergedPr,
  isMergedPr,
  isOpenPr,
  type PrStatusFilter,
} from './prStatus';

/** Substring match against merged timestamp (ISO, locale date/time, year). */
const mergedAtMatchesSearch = (
  mergedAt: string | null | undefined,
  qLower: string,
): boolean => {
  if (!mergedAt || !qLower) return false;
  if (String(mergedAt).toLowerCase().includes(qLower)) return true;
  const d = new Date(mergedAt);
  if (Number.isNaN(d.getTime())) return false;
  if (d.toLocaleDateString().toLowerCase().includes(qLower)) return true;
  if (d.toLocaleString().toLowerCase().includes(qLower)) return true;
  if (String(d.getFullYear()).includes(qLower)) return true;
  return false;
};

interface FilterPrsOptions {
  author?: string | null;
  includeNumber?: boolean;
  searchQuery?: string;
  statusFilter?: PrStatusFilter;
}

export const filterPrs = <T extends CommitLog>(
  prs: T[],
  {
    author,
    includeNumber = false,
    searchQuery,
    statusFilter = 'all',
  }: FilterPrsOptions = {},
) => {
  let filtered = prs;

  if (author) {
    filtered = filtered.filter((pr) => pr.author === author);
  }

  if (statusFilter === 'open') filtered = filtered.filter(isOpenPr);
  else if (statusFilter === 'merged') filtered = filtered.filter(isMergedPr);
  else if (statusFilter === 'closed')
    filtered = filtered.filter(isClosedUnmergedPr);

  const normalizedQuery = searchQuery?.trim().toLowerCase() ?? '';
  if (!normalizedQuery) return filtered;

  return filtered.filter(
    (pr) =>
      pr.pullRequestTitle?.toLowerCase().includes(normalizedQuery) ||
      pr.author?.toLowerCase().includes(normalizedQuery) ||
      pr.repository.toLowerCase().includes(normalizedQuery) ||
      (includeNumber &&
        (String(pr.pullRequestNumber).includes(normalizedQuery) ||
          `#${pr.pullRequestNumber}`.includes(normalizedQuery))) ||
      mergedAtMatchesSearch(pr.mergedAt, normalizedQuery),
  );
};

export const paginateItems = <T>(items: T[], page: number, pageSize: number) =>
  items.slice(page * pageSize, page * pageSize + pageSize);
