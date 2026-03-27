/**
 * Shared frontend search utilities.
 *
 * Provides cache-aware dataset access plus normalization and ranking
 * helpers for miners, repositories, pull requests, and issues.
 */
import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAllMinersQueryKey,
  getAllPrsQueryKey,
  getIssuesQueryKey,
  getReposQueryKey,
  useApiQuery,
} from '../../api';
import { type IssueBounty } from '../../api/models/Issues';
import {
  type CommitLog,
  type MinerEvaluation,
  type Repository,
} from '../../api/models/Dashboard';
import { parseNumber } from '../../utils';

export const MIN_SEARCH_QUERY_LENGTH = 2;
export const SEARCH_TABS = ['miners', 'repositories', 'prs', 'issues'] as const;

export type SearchTab = (typeof SEARCH_TABS)[number];

export type SearchMatchMode = 'quick' | 'full';

export type SearchMiner = {
  githubId: string;
  githubUsername: string;
  hotkey: string;
  currentTier: string;
  credibility: number;
  leaderboardRank: number;
  totalPrs: number;
  totalTokenScore: number;
  totalScore: number;
};

export type SearchRepositoryMetrics = {
  contributors: number;
  totalPRs: number;
  totalScore: number;
};

type SearchRepositoryTableData = {
  metricsByName: Map<string, SearchRepositoryMetrics>;
  rankByName: Map<string, number>;
};

type SearchDatasetState<T> = {
  data: T[];
  isLoading: boolean;
  isError: boolean;
};

type SearchDatasets = {
  miners: SearchDatasetState<SearchMiner>;
  repositories: SearchDatasetState<Repository>;
  prs: SearchDatasetState<CommitLog>;
  issues: SearchDatasetState<IssueBounty>;
};

type SearchResultLimits = {
  miners?: number;
  repositories?: number;
  prs?: number;
  issues?: number;
};

type SearchResults = {
  datasets: SearchDatasets;
  hasQuery: boolean;
  minerResults: SearchMiner[];
  repositoryResults: Repository[];
  prResults: CommitLog[];
  issueResults: IssueBounty[];
};

const pickString = (
  record: Record<string, unknown>,
  keys: string[],
): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value))
      return String(value);
  }

  return '';
};

const normalizeSearchText = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const isDatasetLoading = (
  enabled: boolean,
  cachedData: unknown,
  isLoading: boolean,
) => enabled && cachedData === undefined && isLoading;

const normalizeMiner = (raw: MinerEvaluation | unknown): SearchMiner | null => {
  const record = (raw ?? {}) as Record<string, unknown>;
  const githubId = pickString(record, ['githubId', 'github_id', 'githubID']);
  if (!githubId) return null;

  return {
    githubId,
    githubUsername: pickString(record, ['githubUsername', 'github_username']),
    hotkey: pickString(record, ['hotkey']),
    currentTier: pickString(record, ['currentTier', 'current_tier']),
    credibility: parseNumber(record.credibility),
    leaderboardRank: 0,
    totalPrs: parseNumber(record.totalPrs ?? record.total_prs),
    totalTokenScore: parseNumber(
      record.totalTokenScore ?? record.total_token_score,
    ),
    totalScore: parseNumber(record.totalScore ?? record.total_score),
  };
};

const getMatchRank = (query: string, candidate: string) => {
  const normalizedCandidate = normalizeSearchText(candidate);
  if (!query || !normalizedCandidate) return -1;
  if (normalizedCandidate === query) return 3;
  if (normalizedCandidate.startsWith(query)) return 2;
  if (normalizedCandidate.includes(query)) return 1;
  return -1;
};

const getBestMatchRank = (query: string, candidates: string[]) =>
  candidates.reduce((bestRank, candidate) => {
    const nextRank = getMatchRank(query, candidate);
    return nextRank > bestRank ? nextRank : bestRank;
  }, -1);

const sortByMatchThenTiebreaker = <T>(
  items: T[],
  query: string,
  getCandidates: (item: T) => string[],
  getTiebreaker: (item: T) => number,
) =>
  items
    .map((item) => ({
      item,
      matchRank: getBestMatchRank(query, getCandidates(item)),
      tiebreaker: getTiebreaker(item),
    }))
    .filter((item) => item.matchRank >= 0)
    .sort((a, b) => {
      if (b.matchRank !== a.matchRank) return b.matchRank - a.matchRank;
      return b.tiebreaker - a.tiebreaker;
    })
    .map((item) => item.item);

const getMinerSearchResults = (
  miners: SearchMiner[],
  query: string,
  matchMode: SearchMatchMode,
  limit?: number,
) => {
  const results = sortByMatchThenTiebreaker(
    miners,
    query,
    (miner) =>
      matchMode === 'quick'
        ? [miner.githubId, miner.githubUsername]
        : [miner.githubId, miner.githubUsername, miner.currentTier],
    (miner) => miner.totalScore,
  );

  return limit === undefined ? results : results.slice(0, limit);
};

const getRepositorySearchResults = (
  repositories: Repository[],
  query: string,
  matchMode: SearchMatchMode,
  limit?: number,
) => {
  const results = sortByMatchThenTiebreaker(
    repositories,
    query,
    (repo) =>
      matchMode === 'quick'
        ? [repo.fullName]
        : [repo.fullName, repo.owner, repo.tier || ''],
    (repo) => parseNumber(repo.weight),
  );

  return limit === undefined ? results : results.slice(0, limit);
};

const getPrTimestamp = (pr: CommitLog) =>
  pr.mergedAt
    ? new Date(pr.mergedAt).getTime()
    : new Date(pr.prCreatedAt).getTime();

const getPrSearchResults = (
  prs: CommitLog[],
  query: string,
  matchMode: SearchMatchMode,
  limit?: number,
) => {
  const results = sortByMatchThenTiebreaker(
    prs,
    query,
    (pr) =>
      matchMode === 'quick'
        ? [
            pr.pullRequestTitle || '',
            pr.repository || '',
            String(pr.pullRequestNumber || ''),
          ]
        : [
            pr.pullRequestTitle || '',
            pr.repository || '',
            pr.author || '',
            pr.prState || '',
            String(pr.pullRequestNumber || ''),
          ],
    getPrTimestamp,
  );

  return limit === undefined ? results : results.slice(0, limit);
};

const getIssueTimestamp = (issue: IssueBounty) =>
  new Date(issue.updatedAt || issue.createdAt).getTime();

const getIssueSearchResults = (
  issues: IssueBounty[],
  query: string,
  matchMode: SearchMatchMode,
  limit?: number,
) => {
  const results = sortByMatchThenTiebreaker(
    issues,
    query,
    (issue) =>
      matchMode === 'quick'
        ? [
            issue.title || '',
            issue.repositoryFullName || '',
            String(issue.issueNumber || ''),
          ]
        : [
            issue.title || '',
            issue.repositoryFullName || '',
            issue.status || '',
            String(issue.issueNumber || ''),
          ],
    getIssueTimestamp,
  );

  return limit === undefined ? results : results.slice(0, limit);
};

const useCachedSearchDataset = <T>(
  queryName: string,
  url: string,
  cachedData: T[] | undefined,
  enabled: boolean,
): SearchDatasetState<T> => {
  const query = useApiQuery<T[]>(
    queryName,
    url,
    undefined,
    undefined,
    enabled && cachedData === undefined,
  );

  return {
    data: query.data ?? cachedData ?? [],
    isLoading: isDatasetLoading(enabled, cachedData, query.isLoading),
    isError: query.isError,
  };
};

/**
 * Derives repository rank and metrics maps for the search results table.
 */
export const getRepositorySearchTableData = (
  repositories: Repository[],
  prs: CommitLog[],
): SearchRepositoryTableData => {
  const prStatsMap = new Map<
    string,
    SearchRepositoryMetrics & { uniqueAuthors: Set<string> }
  >();

  prs.forEach((pr) => {
    if (!pr?.repository || !pr.mergedAt) return;

    const repositoryKey = pr.repository.toLowerCase();
    const current = prStatsMap.get(repositoryKey) || {
      contributors: 0,
      totalPRs: 0,
      totalScore: 0,
      uniqueAuthors: new Set<string>(),
    };

    current.totalScore += parseFloat(pr.score || '0');
    current.totalPRs += 1;

    if (pr.author) {
      current.uniqueAuthors.add(pr.author);
      current.contributors = current.uniqueAuthors.size;
    }

    prStatsMap.set(repositoryKey, current);
  });

  const repositoryStats = repositories
    .map((repo) => {
      const stats = prStatsMap.get(repo.fullName.toLowerCase());

      return {
        repository: repo.fullName,
        totalScore: stats?.totalScore || 0,
        totalPRs: stats?.totalPRs || 0,
        uniqueAuthors: stats?.uniqueAuthors || new Set<string>(),
        weight: repo.weight ? parseFloat(String(repo.weight)) : 0,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .sort((a, b) => b.weight - a.weight);

  return {
    metricsByName: new Map(
      repositoryStats.map((repo) => [
        repo.repository.toLowerCase(),
        {
          contributors: repo.uniqueAuthors.size,
          totalPRs: repo.totalPRs,
          totalScore: repo.totalScore,
        },
      ]),
    ),
    rankByName: new Map(
      repositoryStats.map((repo, index) => [
        repo.repository.toLowerCase(),
        index + 1,
      ]),
    ),
  };
};

/**
 * Loads the search datasets
 */
const useSearchDatasets = (enabled: boolean): SearchDatasets => {
  const queryClient = useQueryClient();

  const cachedMiners = queryClient.getQueryData<MinerEvaluation[]>(
    getAllMinersQueryKey(),
  );
  const cachedRepositories =
    queryClient.getQueryData<Repository[]>(getReposQueryKey());
  const cachedPrs = queryClient.getQueryData<CommitLog[]>(getAllPrsQueryKey());
  const cachedIssues =
    queryClient.getQueryData<IssueBounty[]>(getIssuesQueryKey());

  const minerDataset = useCachedSearchDataset<MinerEvaluation>(
    getAllMinersQueryKey()[0],
    '/miners',
    cachedMiners,
    enabled,
  );
  const repositoryDataset = useCachedSearchDataset<Repository>(
    getReposQueryKey()[0],
    '/dash/repos',
    cachedRepositories,
    enabled,
  );
  const prDataset = useCachedSearchDataset<CommitLog>(
    getAllPrsQueryKey()[0],
    '/prs',
    cachedPrs,
    enabled,
  );
  const issueDataset = useCachedSearchDataset<IssueBounty>(
    getIssuesQueryKey()[0],
    '/issues',
    cachedIssues,
    enabled,
  );

  // Miners are normalized into the search-specific shape before return.
  const miners = useMemo(() => {
    const normalizedMiners = minerDataset.data
      .map(normalizeMiner)
      .filter((miner): miner is SearchMiner => Boolean(miner));

    const rankByGithubId = new Map(
      [...normalizedMiners]
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((miner, index) => [miner.githubId, index + 1]),
    );

    return normalizedMiners.map((miner) => ({
      ...miner,
      leaderboardRank: rankByGithubId.get(miner.githubId) || 0,
    }));
  }, [minerDataset.data]);

  return {
    miners: {
      data: miners,
      isLoading: minerDataset.isLoading,
      isError: minerDataset.isError,
    },
    repositories: repositoryDataset,
    prs: prDataset,
    issues: issueDataset,
  };
};

/**
 * Returns grouped search results across miners, repositories, PRs, and issues.
 *
 * @param query Raw user search input.
 * @param limits Per-entity result caps. Omit a key for no limit.
 * @param enabled Whether search datasets should be loaded.
 * @param matchMode Search matching mode for quick vs full results.
 */
export const useSearchResults = (
  query: string,
  limits: SearchResultLimits,
  enabled: boolean,
  matchMode: SearchMatchMode = 'full',
): SearchResults => {
  const datasets = useSearchDatasets(enabled);
  const normalizedQuery = normalizeSearchText(query);
  const hasQuery = normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH;

  const minerResults = useMemo(() => {
    if (!hasQuery) return [];
    return getMinerSearchResults(
      datasets.miners.data,
      normalizedQuery,
      matchMode,
      limits.miners,
    );
  }, [
    datasets.miners.data,
    hasQuery,
    limits.miners,
    matchMode,
    normalizedQuery,
  ]);

  const repositoryResults = useMemo(() => {
    if (!hasQuery) return [];
    return getRepositorySearchResults(
      datasets.repositories.data,
      normalizedQuery,
      matchMode,
      limits.repositories,
    );
  }, [
    datasets.repositories.data,
    hasQuery,
    limits.repositories,
    matchMode,
    normalizedQuery,
  ]);

  const prResults = useMemo(() => {
    if (!hasQuery) return [];
    return getPrSearchResults(
      datasets.prs.data,
      normalizedQuery,
      matchMode,
      limits.prs,
    );
  }, [datasets.prs.data, hasQuery, limits.prs, matchMode, normalizedQuery]);

  const issueResults = useMemo(() => {
    if (!hasQuery) return [];
    return getIssueSearchResults(
      datasets.issues.data,
      normalizedQuery,
      matchMode,
      limits.issues,
    );
  }, [
    datasets.issues.data,
    hasQuery,
    limits.issues,
    matchMode,
    normalizedQuery,
  ]);

  return {
    datasets,
    hasQuery,
    minerResults,
    repositoryResults,
    prResults,
    issueResults,
  };
};
