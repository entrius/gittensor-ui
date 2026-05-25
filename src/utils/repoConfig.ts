/**
 * Per-repository scoring & eligibility config — defaults, bounds and a
 * resolver that marks each value as a repo override or a global default.
 *
 * Source of truth: gittensor/validator/utils/load_weights.py
 * (RepoScoringConfig, RepoEligibilityConfig) and gittensor/constants.py for
 * the default values. Keep these in sync when the validator changes.
 *
 * No repo sets a `scoring` block yet, so until one does every field resolves
 * to the default below.
 */
import type { RepositoryConfig } from '../api/models/Dashboard';
import { pluralize } from './format';

type RepoConfigFormat =
  | 'integer'
  | 'decimal'
  | 'percent'
  | 'multiplier'
  | 'days'
  | 'hours'
  | 'score';

export type RepoConfigFieldDef = {
  /** snake_case key as it appears in the API config blob. */
  key: string;
  label: string;
  description: string;
  /** Global default constant — used when the repo does not override the key. */
  default: number;
  /** Inclusive bound unless the matching `*Exclusive` flag is set. */
  min?: number;
  max?: number;
  minExclusive?: boolean;
  maxExclusive?: boolean;
  format: RepoConfigFormat;
};

// --- Scoring knobs (gittensor RepoScoringConfig) ----------------------------

export const SCORING_FIELD_DEFS: RepoConfigFieldDef[] = [
  {
    key: 'pr_lookback_days',
    label: 'PR lookback window',
    description: 'Rolling window of days a merged PR keeps earning score.',
    default: 30,
    min: 1,
    max: 90,
    format: 'days',
  },
  {
    key: 'open_pr_collateral_percent',
    label: 'Open-PR collateral',
    description:
      "Share of a PR's score withheld as collateral while it stays open.",
    default: 0.2,
    min: 0,
    max: 1,
    format: 'percent',
  },
  {
    key: 'review_penalty_rate',
    label: 'Review penalty rate',
    description: 'Score deducted per maintainer CHANGES_REQUESTED review.',
    default: 0.15,
    min: 0,
    minExclusive: true,
    max: 1,
    format: 'percent',
  },
  {
    key: 'standard_issue_multiplier',
    label: 'Standard issue multiplier',
    description: 'Score multiplier when the issue author is not a maintainer.',
    default: 1.33,
    min: 1,
    max: 5,
    format: 'multiplier',
  },
  {
    key: 'maintainer_issue_multiplier',
    label: 'Maintainer issue multiplier',
    description:
      'Score multiplier when the issue author is a maintainer (OWNER / MEMBER / COLLABORATOR).',
    default: 1.66,
    min: 1,
    max: 5,
    format: 'multiplier',
  },
];

// --- Time-decay curve (nested scoring.time_decay) ---------------------------

export const TIME_DECAY_FIELD_DEFS: RepoConfigFieldDef[] = [
  {
    key: 'grace_period_hours',
    label: 'Grace period',
    description: 'Hours after merge before time decay starts.',
    default: 12,
    min: 0,
    max: 168,
    format: 'hours',
  },
  {
    key: 'sigmoid_midpoint_days',
    label: 'Sigmoid midpoint',
    description:
      'Days after the grace period at which a PR has lost ~50% of its score.',
    default: 10,
    min: 1,
    max: 90,
    format: 'days',
  },
  {
    key: 'sigmoid_steepness',
    label: 'Sigmoid steepness',
    description:
      'Steepness of the time-decay curve — higher decays faster around the midpoint.',
    default: 0.4,
    min: 0.01,
    max: 5,
    format: 'decimal',
  },
  {
    key: 'min_multiplier',
    label: 'Minimum multiplier',
    description: 'Score floor a PR retains at the end of the lookback window.',
    default: 0.05,
    min: 0,
    max: 1,
    format: 'percent',
  },
];

// --- Eligibility / spam gate knobs (gittensor RepoEligibilityConfig) --------

export const ELIGIBILITY_FIELD_DEFS: RepoConfigFieldDef[] = [
  {
    key: 'min_valid_merged_prs',
    label: 'Min valid merged PRs',
    description:
      'Valid merged PRs a miner needs before earning PR score in this repo.',
    default: 3,
    min: 0,
    format: 'integer',
  },
  {
    key: 'min_credibility',
    label: 'Min credibility',
    description: 'Merge-rate credibility required to be PR-eligible.',
    default: 0.8,
    min: 0,
    max: 1,
    format: 'percent',
  },
  {
    key: 'min_token_score_for_base_score',
    label: 'Min token score (PR)',
    description: 'Token score a PR needs to receive any base score.',
    default: 5,
    min: 0,
    format: 'score',
  },
  {
    key: 'excessive_pr_penalty_base_threshold',
    label: 'Excessive-PR penalty threshold',
    description:
      'Open PRs a miner may have before the penalty applies. Exceeding it zeroes the miner’s contribution (PR) score for this repo.',
    default: 2,
    min: 0,
    format: 'integer',
  },
  {
    key: 'open_pr_threshold_token_score',
    label: 'Open-PR slot token score',
    description: 'Token score that buys one additional allowed open PR.',
    default: 300,
    min: 0,
    minExclusive: true,
    format: 'score',
  },
  {
    key: 'max_open_pr_threshold',
    label: 'Max open PRs',
    description: 'Hard cap on a miner’s allowed open PRs.',
    default: 30,
    min: 0,
    format: 'integer',
  },
  {
    key: 'min_valid_solved_issues',
    label: 'Min valid solved issues',
    description:
      'Valid solved issues a miner needs before being issue-discovery-eligible.',
    default: 3,
    min: 0,
    format: 'integer',
  },
  {
    key: 'min_issue_credibility',
    label: 'Min issue credibility',
    description: 'Issue credibility required to be issue-discovery-eligible.',
    default: 0.8,
    min: 0,
    max: 1,
    format: 'percent',
  },
  {
    key: 'min_token_score_for_valid_issue',
    label: 'Min token score (issue)',
    description: 'Solving-PR token score for a solved issue to count as valid.',
    default: 5,
    min: 0,
    format: 'score',
  },
  {
    key: 'open_issue_spam_base_threshold',
    label: 'Open-issue spam threshold',
    description:
      'Open issues a miner may have before the penalty applies. Exceeding it zeroes the miner’s issue-discovery score for this repo.',
    default: 2,
    min: 0,
    format: 'integer',
  },
  {
    key: 'open_issue_spam_token_score_per_slot',
    label: 'Open-issue slot token score',
    description: 'Token score that buys one additional allowed open issue.',
    default: 300,
    min: 0,
    minExclusive: true,
    format: 'score',
  },
  {
    key: 'max_open_issue_threshold',
    label: 'Max open issues',
    description: 'Hard cap on a miner’s allowed open issues.',
    default: 30,
    min: 0,
    format: 'integer',
  },
];

// --- Resolver ---------------------------------------------------------------

export type ResolvedConfigField = {
  def: RepoConfigFieldDef;
  /** Resolved value — the repo override if present, otherwise the default. */
  value: number;
  /** The raw override value, or undefined when falling back to the default. */
  override: number | undefined;
  isOverride: boolean;
};

export type ResolvedConfigGroup = {
  title: string;
  fields: ResolvedConfigField[];
  /** How many fields in the group are repo overrides. */
  overrideCount: number;
};

type ResolvedRepoConfig = {
  scoring: ResolvedConfigGroup;
  timeDecay: ResolvedConfigGroup;
  eligibility: ResolvedConfigGroup;
  /** Total overridden fields across every group. */
  overrideCount: number;
};

function resolveGroup(
  title: string,
  defs: RepoConfigFieldDef[],
  raw: Record<string, unknown> | undefined,
): ResolvedConfigGroup {
  let overrideCount = 0;
  const fields = defs.map<ResolvedConfigField>((def) => {
    const rawValue = raw?.[def.key];
    const isOverride =
      typeof rawValue === 'number' && Number.isFinite(rawValue);
    if (isOverride) overrideCount += 1;
    return {
      def,
      value: isOverride ? (rawValue as number) : def.default,
      override: isOverride ? (rawValue as number) : undefined,
      isOverride,
    };
  });
  return { title, fields, overrideCount };
}

/**
 * Resolve a repository's raw config blob into scoring, time-decay and
 * eligibility groups, with every field marked as a repo override or a
 * fallback to the global default.
 */
export function resolveRepoConfig(
  config?: RepositoryConfig,
): ResolvedRepoConfig {
  const scoring = config?.scoring;
  const scoringGroup = resolveGroup(
    'Scoring',
    SCORING_FIELD_DEFS,
    scoring as Record<string, unknown> | undefined,
  );
  const timeDecayGroup = resolveGroup(
    'Time decay',
    TIME_DECAY_FIELD_DEFS,
    scoring?.time_decay as Record<string, unknown> | undefined,
  );
  const eligibilityGroup = resolveGroup(
    'Eligibility',
    ELIGIBILITY_FIELD_DEFS,
    config?.eligibility as Record<string, unknown> | undefined,
  );
  return {
    scoring: scoringGroup,
    timeDecay: timeDecayGroup,
    eligibility: eligibilityGroup,
    overrideCount:
      scoringGroup.overrideCount +
      timeDecayGroup.overrideCount +
      eligibilityGroup.overrideCount,
  };
}

// --- Display helpers --------------------------------------------------------

/** Human-readable bound, e.g. "[1, 90]" or "(0, 1]". Empty when unbounded. */
export function boundsLabel(def: RepoConfigFieldDef): string {
  if (def.min === undefined && def.max === undefined) return '';
  const lo = def.min === undefined ? '−∞' : def.min;
  const hi = def.max === undefined ? '∞' : def.max;
  const open = def.minExclusive ? '(' : '[';
  const close = def.maxExclusive ? ')' : ']';
  return `${open}${lo}, ${hi}${close}`;
}

/** Format a resolved config value for display per its declared format. */
export function formatRepoConfigValue(
  format: RepoConfigFormat,
  value: number,
): string {
  switch (format) {
    case 'percent': {
      const pct = value * 100;
      return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
    }
    case 'multiplier':
      return `${value}×`;
    case 'days':
      return pluralize(value, 'day');
    case 'hours':
      return pluralize(value, 'hr');
    case 'integer':
    case 'score':
    case 'decimal':
    default:
      return `${value}`;
  }
}
