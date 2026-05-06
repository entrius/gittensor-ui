import {
  type CommitLog,
  type MinerEvaluation,
  type Repository,
  type RepositoryPrScoring,
} from '../api';
import { type IssueBounty } from '../api/models/Issues';
import { isMergedPr } from './prStatus';

export const getGithubAvatarSrc = (username?: string | null) => {
  if (username) {
    return `https://avatars.githubusercontent.com/${username}`;
  }

  return '';
};

// Parses numeric-like values and falls back when the value is missing or invalid.
export const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
};

export const getPrStatusLabel = (
  pr: Pick<CommitLog, 'prState' | 'mergedAt'>,
): 'Merged' | 'Open' | 'Closed' => {
  const state = (pr.prState || '').toUpperCase();
  if (state === 'MERGED' || pr.mergedAt) return 'Merged';
  if (state === 'OPEN' || (!state && !pr.mergedAt)) return 'Open';
  return 'Closed';
};

export const calculateDynamicOpenPrThreshold = (
  minerStats: MinerEvaluation,
  prScoring: RepositoryPrScoring | undefined,
): number => {
  const baseThreshold = parseNumber(prScoring?.excessivePrPenaltyThreshold, 10);
  const tokenScorePer = parseNumber(prScoring?.openPrThresholdTokenScore, 300);
  const maxThreshold = parseNumber(prScoring?.maxOpenPrThreshold, 30);

  if (tokenScorePer <= 0) {
    return Math.min(baseThreshold, maxThreshold);
  }

  const tokenScore = parseNumber(minerStats.totalTokenScore);
  const bonus = Math.floor(tokenScore / tokenScorePer);

  return Math.min(baseThreshold + bonus, maxThreshold);
};

export const calculateOpenIssueThreshold = (
  minerStats: MinerEvaluation,
): number => {
  const issueTokenScore = parseNumber(minerStats.issueTokenScore);
  return Math.min(5 + Math.floor(issueTokenScore / 300), 30);
};

const isMinerEvaluationLike = (value: unknown): value is MinerEvaluation => {
  if (!value || typeof value !== 'object') return false;
  return 'githubId' in value;
};

export const normalizeMinerEvaluations = (
  payload: unknown,
): MinerEvaluation[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isMinerEvaluationLike);
  }

  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  const keyedList = ['items', 'miners', 'results', 'data']
    .map((key) => record[key])
    .find((value) => Array.isArray(value));

  if (Array.isArray(keyedList)) {
    return keyedList.filter(isMinerEvaluationLike);
  }

  const objectValues = Object.values(record);
  if (objectValues.length > 0 && objectValues.every(isMinerEvaluationLike)) {
    return objectValues;
  }

  return [];
};

const isCommitLogLike = (value: unknown): value is CommitLog => {
  if (!value || typeof value !== 'object') return false;
  return 'repository' in value && 'pullRequestNumber' in value;
};

export const normalizeCommitLogs = (payload: unknown): CommitLog[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isCommitLogLike);
  }

  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  const keyedList = ['items', 'prs', 'results', 'data']
    .map((key) => record[key])
    .find((value) => Array.isArray(value));

  if (Array.isArray(keyedList)) {
    return keyedList.filter(isCommitLogLike);
  }

  const objectValues = Object.values(record);
  if (objectValues.length > 0 && objectValues.every(isCommitLogLike)) {
    return objectValues;
  }

  return [];
};

export interface RepoStats {
  repository: string;
  prs: number;
  score: number;
  tokenScore: number;
  weight: number;
  latestPrDate?: string | null;
}

/** Per-repository stats for Issue Discovery (miner solved bounties via winning PRs). */
export interface IssueRepoStats {
  repository: string;
  solved: number;
  validSolved: number;
  issueTokenScore: number;
  bountyEarned: number;
  weight: number;
  latestActivityDate: string | null;
}

export type RepoSortField =
  | 'rank'
  | 'repository'
  | 'prs'
  | 'score'
  | 'tokenScore'
  | 'weight';

export type IssueRepoSortField =
  | 'rank'
  | 'repository'
  | 'solved'
  | 'validSolved'
  | 'issueTokenScore'
  | 'bountyEarned'
  | 'weight';

export type MinerRepoTableSortField = RepoSortField | IssueRepoSortField;

export type SortOrder = 'asc' | 'desc';

const VALID_ISSUE_SOLVE_TOKEN_THRESHOLD = 5;

export const sortMinerRepoStats = (
  stats: RepoStats[],
  field: RepoSortField,
  order: SortOrder,
): RepoStats[] => {
  const sorted = [...stats];
  sorted.sort((a, b) => {
    let compareValue = 0;
    switch (field) {
      case 'repository':
        compareValue = a.repository.localeCompare(b.repository);
        break;
      case 'prs':
        compareValue = a.prs - b.prs;
        break;
      case 'score':
        compareValue = a.score - b.score;
        break;
      case 'tokenScore':
        compareValue = a.tokenScore - b.tokenScore;
        break;
      case 'weight':
        compareValue = a.weight - b.weight;
        break;
      case 'rank':
        compareValue = a.score - b.score;
        break;
    }
    return order === 'asc' ? compareValue : -compareValue;
  });
  return sorted;
};

export const sortIssueRepoStats = (
  stats: IssueRepoStats[],
  field: IssueRepoSortField,
  order: SortOrder,
): IssueRepoStats[] => {
  const sorted = [...stats];
  sorted.sort((a, b) => {
    let compareValue = 0;
    switch (field) {
      case 'repository':
        compareValue = a.repository.localeCompare(b.repository);
        break;
      case 'solved':
        compareValue = a.solved - b.solved;
        break;
      case 'validSolved':
        compareValue = a.validSolved - b.validSolved;
        break;
      case 'issueTokenScore':
        compareValue = a.issueTokenScore - b.issueTokenScore;
        break;
      case 'bountyEarned':
        compareValue = a.bountyEarned - b.bountyEarned;
        break;
      case 'weight':
        compareValue = a.weight - b.weight;
        break;
      case 'rank':
        compareValue = a.issueTokenScore - b.issueTokenScore;
        break;
      default:
        compareValue = 0;
    }
    return order === 'asc' ? compareValue : -compareValue;
  });
  return sorted;
};

// ---------------------------------------------------------------------------
// Scoring window staleness check
// ---------------------------------------------------------------------------

const SCORING_WINDOW_DAYS = 35;

export const isOutsideScoringWindow = (
  date: string | null | undefined,
): boolean => {
  if (!date) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SCORING_WINDOW_DAYS);
  return new Date(date) < cutoff;
};

// ---------------------------------------------------------------------------
// Map builders – extract lookup maps from API data
// ---------------------------------------------------------------------------

export const buildRepoWeightsMap = (
  repos: Repository[] | undefined,
): Map<string, number> => {
  const map = new Map<string, number>();
  if (!Array.isArray(repos)) return map;
  for (const repo of repos) {
    if (repo && repo.fullName) {
      map.set(repo.fullName.toLowerCase(), parseFloat(repo.weight || '0'));
    }
  }
  return map;
};

// ---------------------------------------------------------------------------
// PR aggregation – builds per-repository stats from commit logs
// ---------------------------------------------------------------------------

export const aggregatePRsByRepository = (
  prs: CommitLog[],
  repoWeights: Map<string, number>,
): RepoStats[] => {
  if (!prs || prs.length === 0) return [];

  const statsMap = new Map<string, RepoStats>();

  for (const pr of prs) {
    if (!pr.repository) continue;
    const repoKey = pr.repository.toLowerCase();
    const existing = statsMap.get(repoKey) || {
      repository: pr.repository,
      prs: 0,
      score: 0,
      tokenScore: 0,
      weight: repoWeights.get(repoKey) || 0,
      latestPrDate: null as string | null,
    };
    existing.prs += 1;
    existing.score += parseFloat(pr.score || '0');
    if (isMergedPr(pr)) {
      existing.tokenScore += parseFloat(String(pr.tokenScore ?? '0'));
    }
    if (
      pr.mergedAt &&
      (!existing.latestPrDate || pr.mergedAt > existing.latestPrDate)
    ) {
      existing.latestPrDate = pr.mergedAt;
    }
    statsMap.set(repoKey, existing);
  }

  return Array.from(statsMap.values());
};

/**
 * Repositories where this miner’s merged PR was the winning solve for a completed bounty.
 */
export const aggregateIssueDiscoveryByRepository = (
  prs: CommitLog[],
  issues: IssueBounty[] | undefined,
  repoWeights: Map<string, number>,
): IssueRepoStats[] => {
  if (!prs.length || !issues?.length) return [];

  const winningMinerPrByKey = new Map<string, CommitLog>();
  for (const pr of prs) {
    if (!isMergedPr(pr) || !pr.repository) continue;
    winningMinerPrByKey.set(`${pr.repository}#${pr.pullRequestNumber}`, pr);
  }

  const statsMap = new Map<string, IssueRepoStats>();

  for (const issue of issues) {
    if (issue.status !== 'completed' || issue.winningPrNumber == null) continue;
    const repo = issue.repositoryFullName;
    if (!repo) continue;

    const pr = winningMinerPrByKey.get(`${repo}#${issue.winningPrNumber}`);
    if (!pr) continue;

    let row = statsMap.get(repo);
    if (!row) {
      row = {
        repository: repo,
        solved: 0,
        validSolved: 0,
        issueTokenScore: 0,
        bountyEarned: 0,
        weight: repoWeights.get(repo) || 0,
        latestActivityDate: null,
      };
      statsMap.set(repo, row);
    }

    row.solved += 1;
    const tok = parseNumber(pr.tokenScore);
    row.issueTokenScore += tok;
    if (tok >= VALID_ISSUE_SOLVE_TOKEN_THRESHOLD) {
      row.validSolved += 1;
    }
    row.bountyEarned += parseFloat(issue.bountyAmount || '0');
    const activityTs = issue.completedAt || pr.mergedAt;
    if (
      activityTs &&
      (!row.latestActivityDate || activityTs > row.latestActivityDate)
    ) {
      row.latestActivityDate = activityTs;
    }
  }

  return Array.from(statsMap.values());
};

// ---------------------------------------------------------------------------
// Issue discovery – repo rollups from issue-linked / multiplier PRs
// ---------------------------------------------------------------------------

/**
 * PR counts toward Issue Discovery repo rollups. The miner PR list often omits
 * `issueMultiplier` even when the PR is issue-linked; use label / labelMultiplier too.
 */
export const isIssueDiscoveryContributionPr = (pr: CommitLog): boolean => {
  const rawIm = pr.issueMultiplier;
  if (rawIm != null && String(rawIm).trim() !== '') {
    if (parseNumber(rawIm, 0) > 0) return true;
  }
  if (parseNumber(pr.labelMultiplier, 0) > 0) return true;
  if (pr.label != null && String(pr.label).trim() !== '') return true;
  return false;
};

/**
 * PR counts toward **issue discovery** in global feeds (e.g. `/prs`).
 * Stricter than {@link isIssueDiscoveryContributionPr}: requires a positive
 * issue or label **multiplier**, not merely any GitHub label.
 */
export const isIssueDiscoveryMultiplierPr = (pr: CommitLog): boolean => {
  const rawIm = pr.issueMultiplier;
  if (rawIm != null && String(rawIm).trim() !== '') {
    if (parseNumber(rawIm, 0) > 0) return true;
  }
  if (parseNumber(pr.labelMultiplier, 0) > 0) return true;
  return false;
};

/**
 * Per-repository stats for a miner's issue-discovery repos: **merged** PRs only
 * (aligned with Repositories OSS row), passing {@link isIssueDiscoveryContributionPr}.
 */
export const aggregateIssueDiscoveryRepos = (
  prs: CommitLog[] | undefined,
  repoWeights: Map<string, number>,
): RepoStats[] => {
  const filtered = (prs || [])
    .filter(isIssueDiscoveryContributionPr)
    .filter(isMergedPr);
  return aggregatePRsByRepository(filtered, repoWeights);
};

/** Per-repository rollup for merged PRs that count toward issue discovery. */
export type MergedIssueDiscoveryRepoRollup = {
  discoveryScore: number;
  /** Merged issue-discovery PRs in this repo (proxy when not using miner pro-rating). */
  discoveryIssues: number;
  discoveryContributors: Set<string>;
};

/**
 * Builds discovery stats per repo from the global PR feed: merged PRs with
 * issue-discovery multipliers ({@link isIssueDiscoveryMultiplierPr}).
 */
export const buildMergedIssueDiscoveryByRepo = (
  prs: CommitLog[] | undefined,
): Map<string, MergedIssueDiscoveryRepoRollup> => {
  const map = new Map<string, MergedIssueDiscoveryRepoRollup>();
  if (!prs?.length) return map;

  for (const pr of prs) {
    if (!pr?.repository) continue;
    if (!isMergedPr(pr)) continue;
    if (!isIssueDiscoveryMultiplierPr(pr)) continue;

    const key = pr.repository.toLowerCase();
    const cur = map.get(key) ?? {
      discoveryScore: 0,
      discoveryIssues: 0,
      discoveryContributors: new Set<string>(),
    };
    const token = parseNumber(pr.tokenScore);
    cur.discoveryScore += token > 0 ? token : parseFloat(pr.score || '0');
    cur.discoveryIssues += 1;
    const minerKey = pr.githubId || pr.author;
    if (minerKey) cur.discoveryContributors.add(String(minerKey));
    map.set(key, cur);
  }

  return map;
};

const discoveryWeightKey = (pr: CommitLog): string | null => {
  if (pr.githubId) return String(pr.githubId);
  if (pr.author?.trim()) return pr.author.trim().toLowerCase();
  return null;
};

const discoveryDisplayContributorKey = (pr: CommitLog): string | null => {
  if (pr.author?.trim()) return pr.author.trim();
  if (pr.githubId) return String(pr.githubId);
  return null;
};

export const buildMinerLookupByIdentity = (
  miners: MinerEvaluation[] | undefined,
): Map<string, MinerEvaluation> => {
  const map = new Map<string, MinerEvaluation>();
  if (!miners?.length) return map;
  for (const m of miners) {
    if (m.githubId) map.set(String(m.githubId), m);
    const u = m.githubUsername?.trim().toLowerCase();
    if (u) map.set(u, m);
  }
  return map;
};

/** Prefer program-valid solved; fall back to total solved — not open or all-issue totals. */
const completedDiscoveryIssuesForMiner = (m: MinerEvaluation): number => {
  const valid = parseNumber(m.totalValidSolvedIssues);
  if (valid > 0) return valid;
  return parseNumber(m.totalSolvedIssues);
};

/**
 * Repositories leaderboard discovery row: pro-rated {@link MinerEvaluation.issueDiscoveryScore}
 * and **completed** discovery issues; merged discovery PRs only. Contributors only if they add
 * non-zero pro-rated score or issues in this repo.
 */
export const buildRepoDiscoveryRollupFromMiners = (
  prs: CommitLog[] | undefined,
  miners: MinerEvaluation[] | undefined,
): Map<string, MergedIssueDiscoveryRepoRollup> => {
  const out = new Map<string, MergedIssueDiscoveryRepoRollup>();
  if (!prs?.length) return out;

  const minerByIdentity = buildMinerLookupByIdentity(miners);
  const globalDiscoveryPr = new Map<string, number>();
  const repoDiscoveryPr = new Map<string, Map<string, number>>();
  const displayLabelByWk = new Map<string, string>();
  const unmatched = new Map<string, { score: number; issues: number }>();

  for (const pr of prs) {
    if (!pr?.repository || !isMergedPr(pr)) continue;
    if (!isIssueDiscoveryMultiplierPr(pr)) continue;

    const wk = discoveryWeightKey(pr);
    if (!wk) continue;

    const dk = discoveryDisplayContributorKey(pr);
    if (dk && !displayLabelByWk.has(wk)) displayLabelByWk.set(wk, dk);

    const repoKey = pr.repository.toLowerCase();
    globalDiscoveryPr.set(wk, (globalDiscoveryPr.get(wk) || 0) + 1);

    if (!repoDiscoveryPr.has(repoKey)) {
      repoDiscoveryPr.set(repoKey, new Map());
    }
    const rm = repoDiscoveryPr.get(repoKey)!;
    rm.set(wk, (rm.get(wk) || 0) + 1);

    const miner = minerByIdentity.get(wk);
    if (!miner) {
      const uk = `${repoKey}\0${wk}`;
      const cur = unmatched.get(uk) || { score: 0, issues: 0 };
      const token = parseNumber(pr.tokenScore);
      cur.score += token > 0 ? token : parseFloat(pr.score || '0');
      cur.issues += 1;
      unmatched.set(uk, cur);
    }
  }

  for (const [repoKey, weightMap] of repoDiscoveryPr) {
    let discoveryScore = 0;
    let discoveryIssues = 0;
    const discoveryContributors = new Set<string>();

    for (const wk of weightMap.keys()) {
      const inRepo = weightMap.get(wk) || 0;
      const globalN = Math.max(1, globalDiscoveryPr.get(wk) || 0);
      const w = inRepo / globalN;
      const miner = minerByIdentity.get(wk);

      if (miner) {
        const scorePart = parseNumber(miner.issueDiscoveryScore) * w;
        const issuesPart = completedDiscoveryIssuesForMiner(miner) * w;
        discoveryScore += scorePart;
        discoveryIssues += issuesPart;
        if (scorePart > 0 || issuesPart > 0) {
          const label = displayLabelByWk.get(wk);
          if (label) discoveryContributors.add(label);
        }
      } else {
        const u = unmatched.get(`${repoKey}\0${wk}`);
        if (u) {
          discoveryScore += u.score;
          discoveryIssues += u.issues;
          if (u.score > 0 || u.issues > 0) {
            const label = displayLabelByWk.get(wk);
            if (label) discoveryContributors.add(label);
          }
        }
      }
    }

    out.set(repoKey, {
      discoveryScore,
      discoveryIssues: Math.round(discoveryIssues),
      discoveryContributors,
    });
  }

  return out;
};

export type IssueBountyRepoRollup = {
  bountyIssuesTotal: number;
  bountyIssuesActive: number;
  bountyIssuesCompleted: number;
};

export const buildIssueBountyRollupByRepo = (
  issues: IssueBounty[] | undefined,
): Map<string, IssueBountyRepoRollup> => {
  const map = new Map<string, IssueBountyRepoRollup>();
  if (!issues?.length) return map;

  for (const issue of issues) {
    const name = issue.repositoryFullName?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const cur = map.get(key) ?? {
      bountyIssuesTotal: 0,
      bountyIssuesActive: 0,
      bountyIssuesCompleted: 0,
    };
    cur.bountyIssuesTotal += 1;
    const st = (issue.status || '').toLowerCase();
    if (st === 'active') cur.bountyIssuesActive += 1;
    if (st === 'completed') cur.bountyIssuesCompleted += 1;
    map.set(key, cur);
  }

  return map;
};

// ---------------------------------------------------------------------------
// Filter / display helpers
// ---------------------------------------------------------------------------

export const hasActiveFilters = (searchQuery: string): boolean => {
  return !!searchQuery.trim();
};

export const getDisplayCount = (
  filteredCount: number,
  totalCount: number,
  isFiltered: boolean,
): string => {
  if (isFiltered) {
    return `${filteredCount} of ${totalCount}`;
  }
  return String(filteredCount);
};

export const filterBySearch = <T extends { repository: string }>(
  stats: T[],
  searchQuery: string,
): T[] => {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return stats;
  return stats.filter((r) => r.repository.toLowerCase().includes(q));
};
