import { useMemo } from 'react';
import { useStats } from '../api';

const DAILY_ALPHA_EMISSIONS = 2952;

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
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    return taoPrice * alphaPrice * DAILY_ALPHA_EMISSIONS * daysInMonth;
  }, [stats?.prices]);
};
