import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type MinerStats } from './types';

// Matches the `?eligible=true|false` param written by TopMinersTable so any
// sidebar surface stays in sync with the main table's eligibility filter.
export const useEligibilityFilteredMiners = (
  miners: MinerStats[],
): MinerStats[] => {
  const [searchParams] = useSearchParams();
  const eligibilityFilter = searchParams.get('eligible');
  return useMemo(() => {
    if (eligibilityFilter !== 'true' && eligibilityFilter !== 'false') {
      return miners;
    }
    const wantEligible = eligibilityFilter === 'true';
    return miners.filter((m) => !!m.isEligible === wantEligible);
  }, [miners, eligibilityFilter]);
};
