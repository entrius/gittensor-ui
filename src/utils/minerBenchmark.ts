/**
 * Peer benchmarking for the miner dashboard.
 *
 * Turns the network-wide leaderboard (`useAllMiners` → `MinerEvaluation[]`)
 * into a per-metric percentile standing for a single miner, so absolute
 * figures (a score of 12.5, 41 merged PRs) gain meaning — "top 8%" tells a
 * miner far more than the raw number alone.
 *
 * ⚠️ Read float metrics from the leaderboard list rows only. The single-miner
 * endpoint serves its SUM'd float columns as corrupt strings (see
 * `aggregateMinerTotals`); the list rows are clean. Counts and credibility are
 * clean on both, but we rank against the list either way.
 *
 * No React, no MUI — pure and unit-testable.
 */
import type { MinerEvaluation } from '../api/models/Dashboard';
import { blendedSuccessRate } from './minerProgress';

/** Coerce the API's stringy numerics to a finite number (0 on failure). */
const toNum = (value: unknown): number => {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** A miner's standing on one metric, higher value = better rank. */
export interface Percentile {
  /** 1-based ordinal; ties share the best (lowest) rank. */
  rank: number;
  /** Size of the ranked field. */
  total: number;
  /** Fraction of the field strictly below this miner, 0–1 (1 = best). */
  pct: number;
  /** Fraction from the top, 0–1 (smaller = better). `rank / total`. */
  topPct: number;
  /** Human label, e.g. "top 8%" or "bottom 12%". */
  label: string;
}

export interface MinerBenchmark {
  combinedScore: Percentile | null;
  credibility: Percentile | null;
  mergedPrs: Percentile | null;
  solvedIssues: Percentile | null;
  earnings: Percentile | null;
}

/** Combined OSS + issue-discovery score — matches `computeNetworkRank`. */
const combinedScoreOf = (m: MinerEvaluation): number =>
  toNum(m.totalScore) + toNum(m.issueDiscoveryScore);

const pctLabel = (fraction: number): string => {
  // Round to a whole percent, but never 0% — a leader is "top 1%", not "top 0%".
  const whole = Math.max(1, Math.round(fraction * 100));
  return `${whole}%`;
};

/**
 * Percentile standing for one miner on one metric. Returns `null` when the
 * field is empty/undefined or the miner isn't in it.
 */
export const percentileFor = (
  allMiners: MinerEvaluation[] | undefined,
  githubId: string,
  valueOf: (m: MinerEvaluation) => number,
): Percentile | null => {
  if (!allMiners || allMiners.length === 0) return null;
  const self = allMiners.find((m) => m.githubId === githubId);
  if (!self) return null;

  const total = allMiners.length;
  const mine = valueOf(self);
  let better = 0; // strictly greater value
  let below = 0; // strictly lesser value
  for (const m of allMiners) {
    const v = valueOf(m);
    if (v > mine) better += 1;
    else if (v < mine) below += 1;
  }

  const rank = better + 1; // ties share the best rank
  const topPct = rank / total;
  const pct = below / total;
  const label =
    topPct <= 0.5
      ? `top ${pctLabel(topPct)}`
      : `bottom ${pctLabel((total - rank + 1) / total)}`;

  return { rank, total, pct, topPct, label };
};

/**
 * Percentile standing across every dashboard metric. Each entry is `null` when
 * it can't be computed, so callers render "—".
 */
export const computeMinerBenchmark = (
  allMiners: MinerEvaluation[] | undefined,
  githubId: string,
): MinerBenchmark => ({
  combinedScore: percentileFor(allMiners, githubId, combinedScoreOf),
  // Rank peers by the same merged/total success rate the stat band displays —
  // not the upstream `credibility` field — so the badge matches the figure.
  credibility: percentileFor(allMiners, githubId, (m) =>
    blendedSuccessRate(
      toNum(m.totalMergedPrs),
      toNum(m.totalPrs),
      toNum(m.totalSolvedIssues),
      toNum(m.totalSolvedIssues) +
        toNum(m.totalClosedIssues) +
        toNum(m.totalOpenIssues),
      toNum(m.totalScore),
      toNum(m.issueDiscoveryScore),
    ),
  ),
  mergedPrs: percentileFor(allMiners, githubId, (m) => toNum(m.totalMergedPrs)),
  solvedIssues: percentileFor(allMiners, githubId, (m) =>
    toNum(m.totalSolvedIssues),
  ),
  earnings: percentileFor(allMiners, githubId, (m) => toNum(m.usdPerDay)),
});
