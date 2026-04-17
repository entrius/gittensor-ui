import { isOpenPr, type PrStatusLike } from './prStatus';

export interface PredictedEarningsInput extends PrStatusLike {
  potentialScore?: number | null;
  predictedAlphaPerDay?: number | null;
  predictedTaoPerDay?: number | null;
  predictedUsdPerDay?: number | null;
}

export const hasEarningsPrediction = (pr: PredictedEarningsInput): boolean =>
  isOpenPr(pr) && pr.predictedUsdPerDay != null && pr.predictedUsdPerDay > 0;

export const getPredictedUsdSortValue = (
  pr: PredictedEarningsInput,
): number => {
  if (!isOpenPr(pr)) return -1;
  if (pr.predictedUsdPerDay == null) return 0;
  return pr.predictedUsdPerDay;
};

export const formatUsdPerDay = (
  value: number | null | undefined,
): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  if (value >= 1) {
    return `$${Math.round(value).toLocaleString()}`;
  }
  if (value > 0) return '<$1';
  return '$0';
};

const ALPHA_DECIMALS = 4;
const TAO_DECIMALS = 6;

export const formatAlphaPerDay = (
  value: number | null | undefined,
): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  if (value === 0) return '0';
  if (Math.abs(value) >= 1) {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  }
  return value.toFixed(ALPHA_DECIMALS);
};

export const formatTaoPerDay = (
  value: number | null | undefined,
): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  if (value === 0) return '0';
  if (Math.abs(value) >= 0.01) {
    return value.toFixed(4);
  }
  return value.toFixed(TAO_DECIMALS);
};
