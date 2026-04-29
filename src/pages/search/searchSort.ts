import type { CommitLog } from '../../api/models/Dashboard';
import type { IssueBounty } from '../../api/models/Issues';
import type { SortOrder } from '../../utils/ExplorerUtils';
import { isClosedUnmergedPr, isMergedPr } from '../../utils/prStatus';
import type { MinerSearchData, RepoSearchData } from './searchData';

export type SearchSortTab = 'miners' | 'repositories' | 'prs' | 'issues';

const DEFAULT_SORT: Record<SearchSortTab, { field: string; order: SortOrder }> =
  {
    miners: { field: 'score', order: 'desc' },
    repositories: { field: 'weight', order: 'desc' },
    prs: { field: 'score', order: 'desc' },
    issues: { field: 'date', order: 'desc' },
  };

const VALID_SORT_KEYS: Record<SearchSortTab, ReadonlySet<string>> = {
  miners: new Set([
    'rank',
    'miner',
    'credibility',
    'tokenScore',
    'prs',
    'score',
  ]),
  repositories: new Set([
    'rank',
    'repository',
    'weight',
    'totalScore',
    'prs',
    'discoveryScore',
    'discoveryIssues',
    'contributors',
    'discoveryContributors',
  ]),
  prs: new Set([
    'prNumber',
    'title',
    'repository',
    'author',
    'status',
    'score',
  ]),
  issues: new Set(['issueNumber', 'title', 'repository', 'status', 'date']),
};

export const parseSearchSort = (
  tab: SearchSortTab,
  sortParam: string | null,
  orderParam: string | null,
): { field: string; order: SortOrder } => {
  const fallback = DEFAULT_SORT[tab];
  if (
    sortParam &&
    VALID_SORT_KEYS[tab].has(sortParam) &&
    (orderParam === 'asc' || orderParam === 'desc')
  ) {
    return { field: sortParam, order: orderParam };
  }
  return fallback;
};

/** First-click order when switching to a new sort column (matches leaderboard pattern). */
export const getInitialOrderForColumn = (
  tab: SearchSortTab,
  field: string,
): SortOrder => {
  if (tab === 'miners') {
    if (field === 'miner' || field === 'rank') return 'asc';
  }
  if (tab === 'repositories') {
    if (field === 'repository' || field === 'rank') return 'asc';
  }
  if (tab === 'prs') {
    if (['title', 'repository', 'author'].includes(field)) return 'asc';
  }
  if (tab === 'issues') {
    if (['title', 'repository'].includes(field)) return 'asc';
  }
  return 'desc';
};

export const getNextSearchSort = (
  tab: SearchSortTab,
  currentField: string,
  currentOrder: SortOrder,
  clickedField: string,
): { field: string; order: SortOrder } => {
  if (currentField === clickedField) {
    return {
      field: clickedField,
      order: currentOrder === 'asc' ? 'desc' : 'asc',
    };
  }
  return {
    field: clickedField,
    order: getInitialOrderForColumn(tab, clickedField),
  };
};

const cmpNum = (a: number, b: number, order: SortOrder) =>
  order === 'asc' ? a - b : b - a;

const cmpStr = (a: string, b: string, order: SortOrder) => {
  const c = a.localeCompare(b);
  return order === 'asc' ? c : -c;
};

const prStatusRank = (pr: CommitLog): number => {
  if (isMergedPr(pr)) return 2;
  if (isClosedUnmergedPr(pr)) return 0;
  return 1;
};

const issueStatusRank = (status: string): number => {
  switch (status) {
    case 'registered':
      return 0;
    case 'active':
      return 1;
    case 'completed':
      return 2;
    case 'cancelled':
      return 3;
    default:
      return -1;
  }
};

const issueTimestamp = (issue: IssueBounty): number => {
  const raw =
    issue.completedAt || issue.updatedAt || issue.createdAt || '1970-01-01';
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const prScoreValue = (pr: CommitLog): number => {
  if (pr.prState === 'CLOSED' && !pr.mergedAt) return Number.NEGATIVE_INFINITY;
  const v = parseFloat(pr.score || '0');
  return Number.isFinite(v) ? v : Number.NEGATIVE_INFINITY;
};

export const sortMinerRows = (
  rows: MinerSearchData[],
  field: string,
  order: SortOrder,
): MinerSearchData[] =>
  [...rows].sort((a, b) => {
    let primary = 0;
    switch (field) {
      case 'rank': {
        const ar = a.leaderboardRank > 0 ? a.leaderboardRank : 999999;
        const br = b.leaderboardRank > 0 ? b.leaderboardRank : 999999;
        primary = cmpNum(ar, br, order);
        break;
      }
      case 'miner':
        primary = cmpStr(
          (a.githubUsername || a.githubId).toLowerCase(),
          (b.githubUsername || b.githubId).toLowerCase(),
          order,
        );
        break;
      case 'credibility':
        primary = cmpNum(a.credibility, b.credibility, order);
        break;
      case 'tokenScore':
        primary = cmpNum(a.totalTokenScore, b.totalTokenScore, order);
        break;
      case 'prs':
        primary = cmpNum(a.totalPrs, b.totalPrs, order);
        break;
      case 'score':
      default:
        primary = cmpNum(a.totalScore, b.totalScore, order);
        break;
    }
    if (primary !== 0) return primary;
    return a.githubId.localeCompare(b.githubId);
  });

export const sortRepoRows = (
  rows: RepoSearchData[],
  field: string,
  order: SortOrder,
): RepoSearchData[] =>
  [...rows].sort((a, b) => {
    let primary = 0;
    switch (field) {
      case 'rank':
        primary = cmpNum(a.rank, b.rank, order);
        break;
      case 'repository':
        primary = cmpStr(
          a.fullName.toLowerCase(),
          b.fullName.toLowerCase(),
          order,
        );
        break;
      case 'weight':
        primary = cmpNum(a.weight, b.weight, order);
        break;
      case 'totalScore':
        primary = cmpNum(a.totalScore, b.totalScore, order);
        break;
      case 'prs':
        primary = cmpNum(a.totalPRs, b.totalPRs, order);
        break;
      case 'discoveryScore':
        primary = cmpNum(a.discoveryScore, b.discoveryScore, order);
        break;
      case 'discoveryIssues':
        primary = cmpNum(a.discoveryIssues, b.discoveryIssues, order);
        break;
      case 'contributors':
        primary = cmpNum(a.contributors, b.contributors, order);
        break;
      case 'discoveryContributors':
        primary = cmpNum(
          a.discoveryContributors,
          b.discoveryContributors,
          order,
        );
        break;
      default:
        primary = cmpNum(a.weight, b.weight, order);
        break;
    }
    if (primary !== 0) return primary;
    return a.fullName.localeCompare(b.fullName);
  });

export const sortPrRows = (
  rows: CommitLog[],
  field: string,
  order: SortOrder,
): CommitLog[] =>
  [...rows].sort((a, b) => {
    let primary = 0;
    switch (field) {
      case 'prNumber':
        primary = cmpNum(a.pullRequestNumber, b.pullRequestNumber, order);
        break;
      case 'title':
        primary = cmpStr(
          (a.pullRequestTitle || '').toLowerCase(),
          (b.pullRequestTitle || '').toLowerCase(),
          order,
        );
        break;
      case 'repository':
        primary = cmpStr(
          (a.repository || '').toLowerCase(),
          (b.repository || '').toLowerCase(),
          order,
        );
        break;
      case 'author':
        primary = cmpStr(
          (a.author || '').toLowerCase(),
          (b.author || '').toLowerCase(),
          order,
        );
        break;
      case 'status':
        primary = cmpNum(prStatusRank(a), prStatusRank(b), order);
        break;
      case 'score':
      default:
        primary = cmpNum(prScoreValue(a), prScoreValue(b), order);
        break;
    }
    if (primary !== 0) return primary;
    const ka = `${a.repository}\0${a.pullRequestNumber}`;
    const kb = `${b.repository}\0${b.pullRequestNumber}`;
    return ka.localeCompare(kb);
  });

export const sortIssueRows = (
  rows: IssueBounty[],
  field: string,
  order: SortOrder,
): IssueBounty[] =>
  [...rows].sort((a, b) => {
    let primary = 0;
    switch (field) {
      case 'issueNumber':
        primary = cmpNum(a.issueNumber, b.issueNumber, order);
        break;
      case 'title':
        primary = cmpStr(
          (a.title || '').toLowerCase(),
          (b.title || '').toLowerCase(),
          order,
        );
        break;
      case 'repository':
        primary = cmpStr(
          a.repositoryFullName.toLowerCase(),
          b.repositoryFullName.toLowerCase(),
          order,
        );
        break;
      case 'status':
        primary = cmpNum(
          issueStatusRank(a.status),
          issueStatusRank(b.status),
          order,
        );
        break;
      case 'date':
      default:
        primary = cmpNum(issueTimestamp(a), issueTimestamp(b), order);
        break;
    }
    if (primary !== 0) return primary;
    return cmpNum(a.id, b.id, 'asc');
  });

export type MinerSearchSortKey =
  | 'rank'
  | 'miner'
  | 'credibility'
  | 'tokenScore'
  | 'prs'
  | 'score';

export type RepoSearchSortKey =
  | 'rank'
  | 'repository'
  | 'weight'
  | 'totalScore'
  | 'prs'
  | 'discoveryScore'
  | 'discoveryIssues'
  | 'contributors'
  | 'discoveryContributors';

export type PrSearchSortKey =
  | 'prNumber'
  | 'title'
  | 'repository'
  | 'author'
  | 'status'
  | 'score';

export type IssueSearchSortKey =
  | 'issueNumber'
  | 'title'
  | 'repository'
  | 'status'
  | 'date';
