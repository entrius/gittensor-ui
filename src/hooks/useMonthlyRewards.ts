import { useMemo } from 'react';
import { useStats } from '../api';
import { type Stats } from '../api/models/Dashboard';

/**
 * Fallback subnet 74 daily alpha emission. Used only when the backend's
 * /dash/stats response omits `dailyAlphaEmissions`. Update when chain
 * drift makes this materially wrong, but the live field is preferred.
 */
export const DAILY_ALPHA_EMISSIONS_FALLBACK = 3571;

const resolveDailyAlphaEmissions = (stats: Stats | undefined): number => {
  const raw = stats?.dailyAlphaEmissions;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === 'string') {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DAILY_ALPHA_EMISSIONS_FALLBACK;
};

/**
 * Daily alpha emissions for subnet 74. Reads from live chain state when
 * the backend exposes it; falls back to the hardcoded constant otherwise.
 */
export const useDailyAlphaEmissions = (): number => {
  const { data: stats } = useStats();
  return useMemo(() => resolveDailyAlphaEmissions(stats), [stats]);
};

export const useMonthlyRewards = (): number | undefined => {
  const { data: stats } = useStats();

  return useMemo(() => {
    if (
      !stats?.prices?.tao?.data?.price ||
      !stats?.prices?.alpha?.data?.price
    ) {
      return undefined;
    }
    const taoPrice = stats.prices.tao.data.price;
    const alphaPrice = stats.prices.alpha.data.price;
    const dailyEmissions = resolveDailyAlphaEmissions(stats);
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    return taoPrice * alphaPrice * dailyEmissions * daysInMonth;
  }, [stats]);
};
