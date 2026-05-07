import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type MinerStats } from './types';

const ELIGIBLE_PARAM = 'eligible';

export function useEligibilityFilteredMiners(
  miners: MinerStats[],
  defaultFilter: 'eligible' | 'all' = 'eligible',
): MinerStats[] {
  const [searchParams] = useSearchParams();
  const eligibleParam = searchParams.get(ELIGIBLE_PARAM);

  return useMemo(() => {
    if (eligibleParam === 'all') {
      return miners;
    }
    if (eligibleParam === 'false') {
      return miners.filter((m) => !m.isEligible);
    }
    if (eligibleParam === 'true') {
      return miners.filter((m) => m.isEligible);
    }

    // Fallback to default
    if (defaultFilter === 'all') {
      return miners;
    }
    return miners.filter((m) => m.isEligible);
  }, [miners, eligibleParam, defaultFilter]);
}
