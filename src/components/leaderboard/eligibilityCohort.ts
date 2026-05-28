import { alpha } from '@mui/material/styles';
import theme, { LEADERBOARD_TRACK_COLORS, STATUS_COLORS } from '../../theme';
import { parseNumber } from '../../utils/ExplorerUtils';
import type { MinerEvaluation } from '../../api';

export type CohortKey =
  | 'dual'
  | 'ossOnly'
  | 'discoveryOnly'
  | 'activeOnly'
  | 'inactive';

export const COHORT_KEYS: readonly CohortKey[] = [
  'dual',
  'ossOnly',
  'discoveryOnly',
  'activeOnly',
  'inactive',
] as const;

const KEY_SET = new Set<CohortKey>(COHORT_KEYS);

export const COHORT_LABELS: Record<CohortKey, string> = {
  dual: 'Dual-track',
  ossOnly: 'OSS only',
  discoveryOnly: 'Discovery only',
  activeOnly: 'Below threshold',
  inactive: 'Inactive',
};

// Shared between the Eligibility Mix segments and the row/card accent rails.
export const COHORT_COLORS: Record<CohortKey, string> = {
  dual: LEADERBOARD_TRACK_COLORS.dual,
  ossOnly: LEADERBOARD_TRACK_COLORS.oss,
  discoveryOnly: LEADERBOARD_TRACK_COLORS.discovery,
  activeOnly: STATUS_COLORS.warning,
  inactive: alpha(theme.palette.common.white, 0.22),
};

export const COHORT_DESCRIPTIONS: Record<CohortKey, string> = {
  dual: 'Eligible for both OSS contributions and Issue discovery in at least one repo.',
  ossOnly:
    'Eligible for OSS contributions in at least one repo, but not yet for Issue discovery anywhere.',
  discoveryOnly:
    'Eligible for Issue discovery in at least one repo, but not yet for OSS contributions anywhere.',
  activeOnly:
    'Has merged PRs or solved issues on record but has not crossed an eligibility threshold yet.',
  inactive: 'Registered miners with no merged PRs or solved issues on record.',
};

const isActive = (m: MinerEvaluation): boolean =>
  parseNumber(m.totalPrs) > 0 || parseNumber(m.totalSolvedIssues) > 0;

export const isPenalized = (m: MinerEvaluation): boolean =>
  (m.failedReason ?? '').trim().length > 0;

// Single source of truth for "currently earning" — keeps cohort, pill, and dim in sync.
export const isOssEligibleNow = (m: MinerEvaluation): boolean =>
  !isPenalized(m) && !!m.isEligible && (m.eligibleRepoCount ?? 0) > 0;

export const isDiscoveryEligibleNow = (m: MinerEvaluation): boolean =>
  !isPenalized(m) && !!m.isIssueEligible && (m.issueEligibleRepoCount ?? 0) > 0;

export const isAnyEligibleNow = (m: MinerEvaluation): boolean =>
  isOssEligibleNow(m) || isDiscoveryEligibleNow(m);

export const cohortOf = (m: MinerEvaluation): CohortKey => {
  const oss = isOssEligibleNow(m);
  const disc = isDiscoveryEligibleNow(m);
  if (oss && disc) return 'dual';
  if (oss) return 'ossOnly';
  if (disc) return 'discoveryOnly';
  if (isActive(m)) return 'activeOnly';
  return 'inactive';
};

export const parseCohortParam = (raw: string | null): CohortKey | null => {
  if (raw === null) return null;
  return KEY_SET.has(raw as CohortKey) ? (raw as CohortKey) : null;
};
