import type { EmissionConfig, Stats } from '../api/models';

export interface EmissionBreakdown {
  totalDailyAlpha: number;
  minerSharePercent: number;
  validatorSharePercent: number;
  minerAlphaPerDay: number;
  validatorAlphaPerDay: number;
  minerUsdPerDay: number | null;
  validatorUsdPerDay: number | null;
  totalUsdPerDay: number | null;
  alphaPriceUsd: number | null;
  daysInMonth: number;
}

const daysInCurrentMonth = (): number => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
};

export const computeAlphaUsdPrice = (
  prices: Stats['prices'] | undefined,
): number | null => {
  const tao = prices?.tao?.data?.price;
  const alpha = prices?.alpha?.data?.price;
  if (typeof tao !== 'number' || typeof alpha !== 'number') return null;
  return tao * alpha;
};

export const computeEmissionBreakdown = (
  emission: EmissionConfig | undefined,
  prices: Stats['prices'] | undefined,
): EmissionBreakdown | null => {
  if (!emission) return null;
  const total = Number(emission.dailyAlphaEmission);
  const rawShare = Number(emission.minerEmissionShare);
  if (!Number.isFinite(total) || total <= 0) return null;
  if (!Number.isFinite(rawShare)) return null;

  const minerShare = Math.min(Math.max(rawShare, 0), 1);
  const validatorShare = 1 - minerShare;
  const minerAlphaPerDay = total * minerShare;
  const validatorAlphaPerDay = total * validatorShare;
  const alphaPriceUsd = computeAlphaUsdPrice(prices);

  const toUsd = (alpha: number) =>
    alphaPriceUsd != null ? alpha * alphaPriceUsd : null;

  return {
    totalDailyAlpha: total,
    minerSharePercent: minerShare * 100,
    validatorSharePercent: validatorShare * 100,
    minerAlphaPerDay,
    validatorAlphaPerDay,
    minerUsdPerDay: toUsd(minerAlphaPerDay),
    validatorUsdPerDay: toUsd(validatorAlphaPerDay),
    totalUsdPerDay: toUsd(total),
    alphaPriceUsd,
    daysInMonth: daysInCurrentMonth(),
  };
};

const ALPHA_LARGE_THRESHOLD = 1000;

export const formatAlpha = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  if (value >= ALPHA_LARGE_THRESHOLD) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatUsdCompact = (
  value: number | null | undefined,
): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  if (value >= 1) {
    return `$${Math.round(value).toLocaleString()}`;
  }
  if (value > 0) return '<$1';
  return '$0';
};
