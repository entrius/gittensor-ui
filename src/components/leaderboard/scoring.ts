// Mirrors gittensor/constants.py and gittensor/validator/oss_contributions/scoring.py.
import { ELIGIBILITY_FIELD_DEFS } from '../../utils/repoConfig';
import type { RepositoryConfig } from '../../api';

const DEFAULT_THRESHOLDS: Record<string, number> = Object.fromEntries(
  ELIGIBILITY_FIELD_DEFS.map((d) => [d.key, d.default]),
);

export interface RepoThresholds {
  minValidMergedPrs: number;
  minCredibility: number;
  minValidSolvedIssues: number;
  minIssueCredibility: number;
  openPrSlotBase: number;
  openPrSlotTokenScore: number;
  maxOpenPrSlots: number;
}

const pickNumber = (
  raw: RepositoryConfig['eligibility'] | undefined,
  key: keyof NonNullable<RepositoryConfig['eligibility']>,
): number | undefined => {
  const v = raw?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
};

export const resolveRepoThresholds = (
  config?: RepositoryConfig,
): RepoThresholds => {
  const e = config?.eligibility;
  return {
    minValidMergedPrs:
      pickNumber(e, 'min_valid_merged_prs') ??
      DEFAULT_THRESHOLDS.min_valid_merged_prs,
    minCredibility:
      pickNumber(e, 'min_credibility') ?? DEFAULT_THRESHOLDS.min_credibility,
    minValidSolvedIssues:
      pickNumber(e, 'min_valid_solved_issues') ??
      DEFAULT_THRESHOLDS.min_valid_solved_issues,
    minIssueCredibility:
      pickNumber(e, 'min_issue_credibility') ??
      DEFAULT_THRESHOLDS.min_issue_credibility,
    openPrSlotBase:
      pickNumber(e, 'excessive_pr_penalty_base_threshold') ??
      DEFAULT_THRESHOLDS.excessive_pr_penalty_base_threshold,
    openPrSlotTokenScore:
      pickNumber(e, 'open_pr_threshold_token_score') ??
      DEFAULT_THRESHOLDS.open_pr_threshold_token_score,
    maxOpenPrSlots:
      pickNumber(e, 'max_open_pr_threshold') ??
      DEFAULT_THRESHOLDS.max_open_pr_threshold,
  };
};

// Mirrors `calculate_open_pr_threshold` in the validator.
export const openPrSlotsAllowed = (
  thresholds: RepoThresholds,
  totalTokenScore: number,
): number => {
  const bonus = Math.floor(totalTokenScore / thresholds.openPrSlotTokenScore);
  return Math.min(thresholds.openPrSlotBase + bonus, thresholds.maxOpenPrSlots);
};

export const splitEarnings = (
  usdPerDay: number,
  ossScore: number,
  issueScore: number,
  ossEligible: boolean,
  issueEligible: boolean,
): { oss: number; discovery: number } => {
  const combined = ossScore + issueScore;
  let ossShare = 0;
  let discoveryShare = 0;
  if (ossEligible && issueEligible) {
    ossShare = combined > 0 ? ossScore / combined : 0.5;
    discoveryShare = 1 - ossShare;
  } else if (ossEligible) {
    ossShare = 1;
  } else if (issueEligible) {
    discoveryShare = 1;
  }
  return { oss: usdPerDay * ossShare, discovery: usdPerDay * discoveryShare };
};
