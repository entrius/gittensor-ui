import type { CommitLog } from '../api/models/Dashboard';

// Mirror of validator constants in
// gittensor/validator/utils/datetime_utils.py — keep these in sync.
const TIME_DECAY_MIDPOINT = 10;
const TIME_DECAY_STEEPNESS = 0.4;
const TIME_DECAY_FLOOR = 0.05;
const TIME_DECAY_GRACE_DAYS = 12 / 24;

const decay = (days: number): number => {
  if (days < TIME_DECAY_GRACE_DAYS) return 1;
  const sig =
    1 / (1 + Math.exp(TIME_DECAY_STEEPNESS * (days - TIME_DECAY_MIDPOINT)));
  return Math.max(sig, TIME_DECAY_FLOOR);
};

export interface MonthlyUsdRange {
  min: number;
  max: number;
}

/**
 * Project monthly USD earnings range for a miner.
 *
 * - max: dailyUsd × 30 (assumes the miner sustains the current daily rate).
 * - min: integral over the next 30 days of dailyUsd × ratio(d), where ratio(d)
 *   is the aggregate sigmoid time-decay of the miner's existing merged PRs at
 *   day d vs today. Models "if I stop contributing today".
 */
export const calculateMonthlyUsdRange = (
  dailyUsd: number,
  prs: CommitLog[] | undefined,
): MonthlyUsdRange | null => {
  if (!dailyUsd || !prs || prs.length === 0) return null;
  const now = Date.now();
  const baseAndAge = prs
    .filter((p) => p.mergedAt)
    .map((p) => {
      const score = parseFloat(p.score || '0');
      const ageDays =
        (now - new Date(p.mergedAt as string).getTime()) /
        (1000 * 60 * 60 * 24);
      const d = decay(ageDays);
      return { base: d > 0 ? score / d : 0, ageDays };
    })
    .filter((x) => x.base > 0);
  if (baseAndAge.length === 0) return null;
  const totalToday = baseAndAge.reduce(
    (s, x) => s + x.base * decay(x.ageDays),
    0,
  );
  if (totalToday === 0) return null;
  let monthlyRatio = 0;
  for (let d = 0; d < 30; d++) {
    const totalAtD = baseAndAge.reduce(
      (s, x) => s + x.base * decay(x.ageDays + d),
      0,
    );
    monthlyRatio += totalAtD / totalToday;
  }
  return { min: dailyUsd * monthlyRatio, max: dailyUsd * 30 };
};
