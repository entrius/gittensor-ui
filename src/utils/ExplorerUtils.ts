import { type CommitLog, type MinerEvaluation, type Repository } from '../api';
import { type IssueBounty } from '../api/models/Issues';
import { getRepositoryOwnerAvatarSrc } from './avatar';
import { isMergedPr } from './prStatus';

export const getGithubAvatarSrc = (username?: string | null) =>
  getRepositoryOwnerAvatarSrc(username);

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

export type SortOrder = 'asc' | 'desc';

const VALID_ISSUE_SOLVE_TOKEN_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Scoring window staleness check
// ---------------------------------------------------------------------------

/** Default PR scoring lookback — mirrors gittensor `PR_LOOKBACK_DAYS`. */
const SCORING_WINDOW_DAYS = 30;

export const isOutsideScoringWindow = (
  date: string | null | undefined,
): boolean => {
  if (!date) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SCORING_WINDOW_DAYS);
  return new Date(date) < cutoff;
};

/** ISO timestamp for the start of the scoring window (UTC, suitable for
 *  GitHub Search `created:>=` qualifier and other since-style filters). */
export const getScoringWindowStartIso = (): string => {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - SCORING_WINDOW_DAYS);
  return cutoff.toISOString();
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
      map.set(
        repo.fullName.toLowerCase(),
        parseFloat(String(repo.config?.emissionShare ?? 0)),
      );
    }
  }
  return map;
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
const isIssueDiscoveryMultiplierPr = (pr: CommitLog): boolean => {
  const rawIm = pr.issueMultiplier;
  if (rawIm != null && String(rawIm).trim() !== '') {
    if (parseNumber(rawIm, 0) > 0) return true;
  }
  if (parseNumber(pr.labelMultiplier, 0) > 0) return true;
  return false;
};

/** Per-repository rollup for merged PRs that count toward issue discovery. */
type MergedIssueDiscoveryRepoRollup = {
  discoveryScore: number;
  /** Merged issue-discovery PRs in this repo (proxy when not using miner pro-rating). */
  discoveryIssues: number;
  discoveryContributors: Set<string>;
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

const buildMinerLookupByIdentity = (
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
