import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type MinerStats } from './types';

const ELIGIBLE_PARAM = 'eligible';

export function useEligibilityFilteredMiners(
  miners: MinerStats[],
): MinerStats[] {
  const [searchParams] = useSearchParams();
  const eligibleParam = searchParams.get(ELIGIBLE_PARAM);

  return useMemo(() => {
    if (eligibleParam === 'true') {
      return miners.filter((m) => m.isEligible);
    }
    if (eligibleParam === 'false') {
      return miners.filter((m) => !m.isEligible);
    }
    return miners;
  }, [miners, eligibleParam]);
}
