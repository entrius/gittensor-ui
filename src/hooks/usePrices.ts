import { useStats } from '../api';

/**
 * Shared hook that extracts live Tao and Alpha prices from the dashboard stats.
 * Replaces the 3-line boilerplate that was duplicated in every issue component.
 */
export const usePrices = () => {
  const { data: dashStats } = useStats();
  const taoPrice = dashStats?.prices?.tao?.data?.price ?? 0;
  const alphaPrice = dashStats?.prices?.alpha?.data?.price ?? 0;
  return { taoPrice, alphaPrice, hasPrices: taoPrice > 0 && alphaPrice > 0 };
};
