import { type CommitLog } from '../api';
import { isClosedUnmergedPr, isMergedPr, isOpenPr } from './prStatus';

export type PrStatusFilter = 'all' | 'open' | 'merged' | 'closed';

interface FilterPrsOptions {
  author?: string | null;
  /** When non-empty, only PRs whose author is in this list are kept. */
  authors?: readonly string[];
  includeNumber?: boolean;
  searchQuery?: string;
  statusFilter?: PrStatusFilter;
}

export const filterPrs = <T extends CommitLog>(
  prs: T[],
  {
    author,
    authors,
    includeNumber = false,
    searchQuery = '',
    statusFilter = 'all',
  }: FilterPrsOptions = {},
) => {
  let filtered = prs;

  if (authors && authors.length > 0) {
    const set = new Set(authors);
    filtered = filtered.filter((pr) => pr.author != null && set.has(pr.author));
  } else if (author) {
    filtered = filtered.filter((pr) => pr.author === author);
  }

  if (statusFilter === 'open') filtered = filtered.filter(isOpenPr);
  else if (statusFilter === 'merged') filtered = filtered.filter(isMergedPr);
  else if (statusFilter === 'closed')
    filtered = filtered.filter(isClosedUnmergedPr);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return filtered;

  return filtered.filter((pr) => {
    if (pr.pullRequestTitle?.toLowerCase().includes(normalizedQuery))
      return true;
    if (pr.repository.toLowerCase().includes(normalizedQuery)) return true;
    if (includeNumber) {
      const num = String(pr.pullRequestNumber);
      if (num.includes(normalizedQuery)) return true;
      if (`#${num}`.includes(normalizedQuery)) return true;
    }
    return false;
  });
};

export const paginateItems = <T>(items: T[], page: number, pageSize: number) =>
  items.slice(page * pageSize, page * pageSize + pageSize);
