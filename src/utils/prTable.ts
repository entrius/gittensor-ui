import { type CommitLog } from '../api';
import { isClosedUnmergedPr, isMergedPr, isOpenPr } from './prStatus';

export type PrStatusFilter = 'all' | 'open' | 'merged' | 'closed';

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
    searchQuery = '',
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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return filtered;

  return filtered.filter(
    (pr) =>
      pr.pullRequestTitle?.toLowerCase().includes(normalizedQuery) ||
      pr.repository.toLowerCase().includes(normalizedQuery) ||
      pr.author?.toLowerCase().includes(normalizedQuery) ||
      (includeNumber && String(pr.pullRequestNumber).includes(normalizedQuery)),
  );
};

export const paginateItems = <T>(items: T[], page: number, pageSize: number) =>
  items.slice(page * pageSize, page * pageSize + pageSize);
