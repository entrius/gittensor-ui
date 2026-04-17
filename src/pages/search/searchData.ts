/**
 * Search data utilities.
 * Normalizes raw search datasets and derives search-specific data, matching, and ranking.
 */
import { useMemo } from 'react';
import { type IssueBounty } from '../../api/models/Issues';
import {
  type CommitLog,
  type MinerEvaluation,
  type Repository,
} from '../../api/models/Dashboard';
import { useSearchDatasets } from '../../api/SearchApi';
import { parseNumber } from '../../utils';

export const MIN_SEARCH_QUERY_LENGTH = 2;

export type SearchMatchMode = 'quick' | 'full';

export type MinerSearchData = {
  githubId: string;
  githubUsername: string;
  hotkey: string;
  credibility: number;
  leaderboardRank: number;
  totalPrs: number;
  totalTokenScore: number;
  totalScore: number;
};

export type RepoSearchData = {
  fullName: string;
  owner: string;
  weight: number;
  rank: number;
  contributors: number;
  totalPRs: number;
  totalScore: number;
};

type SearchResultLimits = {
  miners?: number;
  repositories?: number;
  prs?: number;
  issues?: number;
};

const normalizeSearchText = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const limitResults = <T>(results: T[], limit?: number) =>
  limit === undefined ? results : results.slice(0, limit);

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

const buildMinerSearchData = (rawMiners: MinerEvaluation[]): MinerSearchData[] => {
  const miners = Array.isArray(rawMiners) ? rawMiners : [];
  const normalizedMiners = miners.map((miner) => ({
    githubId: miner.githubId,
    githubUsername: miner.githubUsername || '',
    hotkey: miner.hotkey || '',
    credibility: parseNumber(miner.credibility),
    leaderboardRank: 0,
    totalPrs: parseNumber(miner.totalPrs),
    totalTokenScore: parseNumber(miner.totalTokenScore),
    totalScore: parseNumber(miner.totalScore),
  }));

  const rankByGithubId = new Map(
    [...normalizedMiners]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((miner, index) => [miner.githubId, index + 1]),
  );

  return normalizedMiners.map((miner) => ({
    ...miner,
    leaderboardRank: rankByGithubId.get(miner.githubId) || 0,
  }));
};

const getMinerSearchResults = (
  miners: MinerSearchData[],
  query: string,
  matchMode: SearchMatchMode,
  limit?: number,
) => {
  const results = sortByMatchThenTiebreaker(
    miners,
    query,
    (miner) => [miner.githubId, miner.githubUsername],
    (miner) => miner.totalScore,
  );

  return limitResults(results, limit);
};

const buildRepoSearchData = (
  repositories: Repository[],
  prs: CommitLog[],
): RepoSearchData[] => {
  const prStatsMap = new Map<
    string,
    Pick<RepoSearchData, 'contributors' | 'totalPRs' | 'totalScore'> & {
      uniqueAuthors: Set<string>;
    }
  >();

  // Aggregate merged PR stats by repository
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

  // Build repository search data ranked by weight, then total score.
  return repositories
    .map((repo) => {
      const stats = prStatsMap.get(repo.fullName.toLowerCase());

      return {
        fullName: repo.fullName,
        owner: repo.owner,
        weight: parseNumber(repo.weight),
        totalScore: stats?.totalScore || 0,
        totalPRs: stats?.totalPRs || 0,
        contributors: stats?.uniqueAuthors.size || 0,
      };
    })
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.totalScore - a.totalScore;
    })
    .map((repo, index) => ({
      ...repo,
      rank: index + 1,
    }));
};

const getRepositorySearchResults = (
  repositories: RepoSearchData[],
  query: string,
  matchMode: SearchMatchMode,
  limit?: number,
) => {
  const results = sortByMatchThenTiebreaker(
    repositories,
    query,
    (repo) => [repo.fullName, repo.owner],
    (repo) => repo.weight,
  );

  return limitResults(results, limit);
};

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
    (pr) => new Date(pr.mergedAt ?? pr.prCreatedAt).getTime(),
  );

  return limitResults(results, limit);
};

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
    (issue) => new Date(issue.updatedAt || issue.createdAt).getTime(),
  );

  return limitResults(results, limit);
};

/**
 * Build search results from the raw datasets exposed by SearchApi.
 * @param query Raw search input.
 * @param limits Per-entity result limits.
 * @param shouldFetch When true, missing datasets are allowed to fetch.
 * @param matchMode Controls quick vs full search matching.
 */
export const useSearchResults = (
  query: string,
  limits: SearchResultLimits,
  shouldFetch: boolean,
  matchMode: SearchMatchMode = 'full',
) => {
  const datasets = useSearchDatasets(shouldFetch);
  const normalizedQuery = normalizeSearchText(query);
  const hasQuery = normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH;

  const minerSearchData = useMemo(
    () => buildMinerSearchData(datasets.miners.data),
    [datasets.miners.data],
  );

  const repoSearchData = useMemo(
    () => buildRepoSearchData(datasets.repositories.data, datasets.prs.data),
    [datasets.prs.data, datasets.repositories.data],
  );

  const minerResults = useMemo(() => {
    if (!hasQuery) return [];
    return getMinerSearchResults(
      minerSearchData,
      normalizedQuery,
      matchMode,
      limits.miners,
    );
  }, [hasQuery, limits.miners, matchMode, normalizedQuery, minerSearchData]);

  const repoResults = useMemo(() => {
    if (!hasQuery) return [];
    return getRepositorySearchResults(
      repoSearchData,
      normalizedQuery,
      matchMode,
      limits.repositories,
    );
  }, [
    hasQuery,
    limits.repositories,
    matchMode,
    normalizedQuery,
    repoSearchData,
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
    repositoryResults: repoResults,
    prResults,
    issueResults,
  };
};