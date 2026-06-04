/**
 * Pure helpers for the miner performance dashboard.
 *
 * These compute the "unlock progress", open-PR risk allowance and network
 * standing that the dashboard visualises. The validator removed the old
 * Bronze/Silver/Gold tier ladder; the live API exposes no tier fields. The
 * real "unlock" mechanic is the per-repository eligibility gate — a miner
 * starts earning PR (or issue-discovery) score in a repo once they clear a
 * minimum count of *valid* contributions AND a minimum credibility. This file
 * turns those gates into progress the UI can render.
 *
 * Thresholds come from `repoConfig.ts` (which mirrors gittensor's
 * `RepoEligibilityConfig` + `constants.py`), so nothing here hardcodes the
 * 3 / 0.80 defaults — a repo override flows through automatically.
 *
 * No React, no MUI — keep this unit-testable and side-effect free.
 */
import type {
  CommitLog,
  MinerEvaluation,
  MinerRepositoryEvaluation,
  RepositoryConfig,
} from '../api/models/Dashboard';
import { ELIGIBILITY_FIELD_DEFS } from './repoConfig';

export type ViewMode = 'prs' | 'issues';

/** Coerce the API's stringy numerics to a finite number (0 on failure). */
const toNum = (value: unknown): number => {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const ELIGIBILITY_DEFAULTS: Record<string, number> = Object.fromEntries(
  ELIGIBILITY_FIELD_DEFS.map((def) => [def.key, def.default]),
);

/** Resolved eligibility-gate thresholds for one repository. */
export interface EligibilityThresholds {
  minValidMergedPrs: number;
  minCredibility: number;
  minTokenScoreForBaseScore: number;
  excessivePrPenaltyBaseThreshold: number;
  openPrThresholdTokenScore: number;
  maxOpenPrThreshold: number;
  minValidSolvedIssues: number;
  minIssueCredibility: number;
}

const resolve = (config: RepositoryConfig | undefined, key: string): number => {
  const override =
    config?.eligibility?.[key as keyof typeof config.eligibility];
  return typeof override === 'number' && Number.isFinite(override)
    ? override
    : (ELIGIBILITY_DEFAULTS[key] ?? 0);
};

/**
 * Resolve a repository's eligibility-gate thresholds, applying any per-repo
 * override on top of the global defaults from `repoConfig.ts`.
 */
export const getEligibilityThresholds = (
  config?: RepositoryConfig,
): EligibilityThresholds => ({
  minValidMergedPrs: resolve(config, 'min_valid_merged_prs'),
  minCredibility: resolve(config, 'min_credibility'),
  minTokenScoreForBaseScore: resolve(config, 'min_token_score_for_base_score'),
  excessivePrPenaltyBaseThreshold: resolve(
    config,
    'excessive_pr_penalty_base_threshold',
  ),
  openPrThresholdTokenScore: resolve(config, 'open_pr_threshold_token_score'),
  maxOpenPrThreshold: resolve(config, 'max_open_pr_threshold'),
  minValidSolvedIssues: resolve(config, 'min_valid_solved_issues'),
  minIssueCredibility: resolve(config, 'min_issue_credibility'),
});

/**
 * Count a miner's *valid* merged PRs per repository — merged PRs whose token
 * score clears the repo's `min_token_score_for_base_score` gate. This matches
 * the validator's eligibility definition (raw merged count is not enough).
 *
 * `thresholdFor` lets callers apply per-repo token thresholds; when omitted the
 * global default is used for every repo.
 */
export const countValidMergedPrsByRepo = (
  prs: CommitLog[] | undefined,
  thresholdFor?: (repositoryFullName: string) => number,
): Map<string, number> => {
  const counts = new Map<string, number>();
  if (!prs) return counts;
  const defaultThreshold =
    ELIGIBILITY_DEFAULTS['min_token_score_for_base_score'] ?? 5;
  for (const pr of prs) {
    if (!pr.mergedAt) continue;
    const threshold = thresholdFor
      ? thresholdFor(pr.repository)
      : defaultThreshold;
    if (toNum(pr.tokenScore) >= threshold) {
      // Eval rows lowercase the repo name while PR rows keep GitHub's original
      // casing — key by lowercase so per-repo lookups always match.
      const key = pr.repository.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
};

/** Progress of a single gate (count or ratio) toward its threshold. */
export interface GateProgress {
  /** Current value (PR count, or credibility as a 0–1 ratio). */
  have: number;
  /** Threshold the value must reach. */
  need: number;
  /** How much is still missing (never negative). */
  remaining: number;
  /** Completion fraction, clamped to [0, 1]. */
  pct: number;
  met: boolean;
}

const gate = (have: number, need: number): GateProgress => {
  const remaining = Math.max(0, need - have);
  const pct = need <= 0 ? 1 : Math.min(1, Math.max(0, have / need));
  return { have, need, remaining, pct, met: have >= need };
};

/** A repository's unlock standing for the active track (PRs or issues). */
export interface RepoUnlock {
  /** Server-authoritative eligibility flag for the active track. */
  unlocked: boolean;
  /** Contribution-count gate (valid merged PRs / valid solved issues). */
  count: GateProgress;
  /** Credibility gate (0–1 ratio). */
  credibility: GateProgress;
  /** Overall progress = mean of the two gate fractions, clamped to [0, 1]. */
  overallPct: number;
}

/**
 * Compute a repository's unlock progress for the active track.
 *
 * The `unlocked` flag comes straight from the server (`isEligible` /
 * `isIssueEligible`) — the progress bars are the *explanation* of how close an
 * un-unlocked repo is, never a re-derivation of the verdict.
 */
export const computeRepoUnlock = (
  repo: MinerRepositoryEvaluation,
  validCount: number,
  thresholds: EligibilityThresholds,
  mode: ViewMode,
): RepoUnlock => {
  const isIssue = mode === 'issues';
  const count = isIssue
    ? gate(toNum(repo.totalValidSolvedIssues), thresholds.minValidSolvedIssues)
    : gate(validCount, thresholds.minValidMergedPrs);
  const credibility = isIssue
    ? gate(toNum(repo.issueCredibility), thresholds.minIssueCredibility)
    : gate(toNum(repo.credibility), thresholds.minCredibility);
  return {
    unlocked: isIssue ? repo.isIssueEligible : repo.isEligible,
    count,
    credibility,
    overallPct: (count.pct + credibility.pct) / 2,
  };
};

/**
 * The number of open PRs a miner may keep in a repo before the excessive-open-PR
 * gate zeroes their contribution score: `min(base + floor(tokenScore /
 * perSlot), max)`. Higher lifetime token score buys more open-PR headroom.
 */
export const computeOpenPrAllowance = (
  totalTokenScore: number,
  thresholds: EligibilityThresholds,
): number => {
  const perSlot = thresholds.openPrThresholdTokenScore;
  const bonus =
    perSlot > 0 ? Math.floor(Math.max(0, totalTokenScore) / perSlot) : 0;
  return Math.min(
    thresholds.excessivePrPenaltyBaseThreshold + bonus,
    thresholds.maxOpenPrThreshold,
  );
};

/**
 * Clean, miner-wide totals for the headline stat band.
 *
 * ⚠️ The single-miner endpoint (`GET /miners/:id`) returns its SUM'd float
 * columns (total/base/issue score, additions/deletions, collateral, token
 * score) as concatenated garbage strings — `Number()` of them is NaN. Only its
 * integer counts, credibility (MAX) and earnings are trustworthy. So those
 * float aggregates are taken from the clean leaderboard row (`GET /miners`)
 * when the miner is registered, falling back to summing the per-repo
 * `repositories[]` rows (which are clean) otherwise.
 */
export interface MinerTotals {
  ossScore: number;
  baseScore: number;
  discScore: number;
  combinedScore: number;
  collateral: number;
  additions: number;
  deletions: number;
  mergedPrs: number;
  openPrs: number;
  closedPrs: number;
  prs: number;
  solvedIssues: number;
  closedIssues: number;
  openIssues: number;
  ossCred: number;
  issueCred: number;
  /** Score-weighted blend of the two credibilities (max fallback). */
  blendedCred: number;
}

export const aggregateMinerTotals = (
  single: MinerEvaluation | undefined,
  listed: MinerEvaluation | undefined,
): MinerTotals => {
  const sumRepo = (field: keyof MinerRepositoryEvaluation): number =>
    (single?.repositories ?? []).reduce((s, r) => s + toNum(r[field]), 0);

  // Float aggregates: clean list row first, else sum the clean per-repo rows.
  const ossScore = listed ? toNum(listed.totalScore) : sumRepo('totalScore');
  const baseScore = listed
    ? toNum(listed.baseTotalScore)
    : sumRepo('baseTotalScore');
  const discScore = listed
    ? toNum(listed.issueDiscoveryScore)
    : sumRepo('issueDiscoveryScore');
  const collateral = listed
    ? toNum(listed.totalCollateralScore)
    : sumRepo('totalCollateralScore');
  // additions/deletions only exist miner-wide (not per repo) — list row only.
  const additions = toNum(listed?.totalAdditions);
  const deletions = toNum(listed?.totalDeletions);

  // Credibility (MAX) is clean on both endpoints; prefer the list row.
  const src = listed ?? single;
  const ossCred = toNum(src?.credibility);
  const issueCred = toNum(src?.issueCredibility);
  const denom = ossScore + discScore;
  const blendedCred =
    denom > 0
      ? (ossScore * ossCred + discScore * issueCred) / denom
      : Math.max(ossCred, issueCred);

  // Contribution counts: sum the authoritative per-repo rows when we have them
  // (this is exactly what the repositories table shows). The miner-wide/list
  // totals can disagree — they cover a wider scope than the tracked repos — so
  // the per-repo sum is the one that matches the rest of the dashboard. Fall
  // back to the flat totals only when there are no per-repo rows.
  const hasRepos = (single?.repositories ?? []).length > 0;
  const mergedPrs = hasRepos
    ? sumRepo('totalMergedPrs')
    : toNum(src?.totalMergedPrs);
  const openPrs = hasRepos ? sumRepo('totalOpenPrs') : toNum(src?.totalOpenPrs);
  const closedPrs = hasRepos
    ? sumRepo('totalClosedPrs')
    : toNum(src?.totalClosedPrs);
  const prs = hasRepos ? mergedPrs + openPrs + closedPrs : toNum(src?.totalPrs);
  const solvedIssues = hasRepos
    ? sumRepo('totalSolvedIssues')
    : toNum(src?.totalSolvedIssues);
  const openIssues = hasRepos
    ? sumRepo('totalOpenIssues')
    : toNum(src?.totalOpenIssues);
  const closedIssues = hasRepos
    ? sumRepo('totalClosedIssues')
    : toNum(src?.totalClosedIssues);

  return {
    ossScore,
    baseScore,
    discScore,
    combinedScore: ossScore + discScore,
    collateral,
    additions,
    deletions,
    mergedPrs,
    openPrs,
    closedPrs,
    prs,
    solvedIssues,
    closedIssues,
    openIssues,
    ossCred,
    issueCred,
    blendedCred,
  };
};

/**
 * Dashboard "success rate": merged PRs over *all* PRs blended with solved issues
 * over *all* issues, weighted by each track's score so the dominant track leads.
 * Open (still-unresolved) PRs/issues count against the rate — they are pending,
 * not successes — so a miner with merges still in flight reads below 100%.
 * Falls back to the larger single-track rate when neither track has scored yet.
 *
 * This intentionally derives the rate from real outcome counts rather than the
 * upstream `credibility` field (which is a separately-modelled author trust
 * score, not a merge ratio).
 */
export const blendedSuccessRate = (
  mergedPrs: number,
  totalPrs: number,
  solvedIssues: number,
  totalIssues: number,
  ossScore: number,
  discScore: number,
): number => {
  const ossRate = totalPrs > 0 ? mergedPrs / totalPrs : 0;
  const discRate = totalIssues > 0 ? solvedIssues / totalIssues : 0;
  const denom = ossScore + discScore;
  if (denom > 0) return (ossScore * ossRate + discScore * discRate) / denom;
  return Math.max(ossRate, discRate);
};

export interface NetworkRank {
  rank: number;
  total: number;
}

/**
 * The miner's standing on the subnet as a 1-based ordinal, computed by ranking
 * every active miner by combined OSS + issue-discovery score.
 *
 * Note: we deliberately do NOT use `metagraphRank` here — in Bittensor that is
 * the normalised rank *metric* (0–1), not a leaderboard position, so it would
 * render a misleading "#0".
 */
export const computeNetworkRank = (
  allMiners: MinerEvaluation[] | undefined,
  githubId: string,
): NetworkRank | null => {
  if (!allMiners || allMiners.length === 0) return null;
  const total = allMiners.length;
  const combined = (m: MinerEvaluation): number =>
    toNum(m.totalScore) + toNum(m.issueDiscoveryScore);
  const ordered = allMiners.slice().sort((a, b) => combined(b) - combined(a));
  const idx = ordered.findIndex((m) => m.githubId === githubId);
  return idx === -1 ? null : { rank: idx + 1, total };
};
