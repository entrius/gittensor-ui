import type { PullRequestDetails } from '../api/models/Dashboard';

export interface MultiplierPillDef {
  key: string;
  label: string;
  value: number;
  format: 'multiplier' | 'value' | 'percent';
  tooltipTitle: string;
  tooltipDesc: string;
}

export interface MultiplierGridEntry {
  label: string;
  value: string;
  isCredibility?: boolean;
}

interface PillConfig {
  key: string;
  label: string;
  field: keyof PullRequestDetails;
  title: string;
  desc: string;
  format?: 'value';
}

function parseOpt(raw: string | number | undefined | null): number {
  return parseFloat(String(raw ?? '0'));
}
function fmtMul(raw: string | number): string {
  return `${Number(raw).toFixed(4)}×`;
}
function fmtVal(raw: string | number): string {
  return Number(raw).toFixed(4);
}
function fmtGrid(raw: string | number, suffix: string = 'x'): string {
  return `${parseFloat(String(raw)).toFixed(2)}${suffix}`;
}

function resolvePillLabel(pr: PullRequestDetails, cfg: PillConfig): string {
  if (cfg.key !== 'label') return cfg.label;
  const hasLabel = pr.label != null && pr.label.length > 0;
  return hasLabel ? `label: ${pr.label}` : 'label';
}

function resolvePillTooltip(pr: PullRequestDetails, cfg: PillConfig): string {
  if (cfg.key !== 'label') return cfg.desc;
  const hasLabel = pr.label != null && pr.label.length > 0;
  return hasLabel
    ? `Label "${pr.label}" — adjusts score based on PR classification.`
    : cfg.desc;
}

const PILL_CONFIGS: PillConfig[] = [
  {
    key: 'cred',
    label: 'cred',
    field: 'credibilityMultiplier',
    title: 'Credibility',
    desc: 'Based on your PR success rate, scaled to reward consistency.',
  },
  {
    key: 'repoWt',
    label: 'repo wt',
    field: 'repoWeightMultiplier',
    title: 'Repo Weight',
    desc: 'Based on repository weight and activity.',
  },
  {
    key: 'issue',
    label: 'issue',
    field: 'issueMultiplier',
    title: 'Issue',
    desc: 'Bonus for PRs linked to issues.',
  },
  {
    key: 'decay',
    label: 'decay',
    field: 'timeDecayMultiplier',
    title: 'Time Decay',
    desc: 'Recent PRs score higher.',
  },
  {
    key: 'spam',
    label: 'spam',
    field: 'openPrSpamMultiplier',
    title: 'Open PR Spam',
    desc: 'Penalty for excessive open PRs.',
  },
  {
    key: 'review',
    label: 'review',
    field: 'reviewQualityMultiplier',
    title: 'Review Quality',
    desc: 'Multiplier based on the amount of requested changes the PR required.',
  },
  {
    key: 'label',
    label: 'label',
    field: 'labelMultiplier',
    title: 'Label Multiplier',
    desc: 'Adjusts score based on PR classification.',
  },
  {
    key: 'density',
    label: 'density',
    field: 'codeDensity',
    title: 'Code Density',
    desc: 'Ratio of meaningful code changes to total diff size.',
    format: 'value',
  },
];

export function buildMergedPillDefs(
  pr: PullRequestDetails,
): MultiplierPillDef[] {
  return PILL_CONFIGS.filter((cfg) => pr[cfg.field] != null).map((cfg) => {
    const raw = pr[cfg.field] as string | number;
    const isValue = cfg.format === 'value';
    return {
      key: cfg.key,
      label: resolvePillLabel(pr, cfg),
      value: parseOpt(raw),
      format: (cfg.format ?? 'multiplier') as MultiplierPillDef['format'],
      tooltipTitle: `${cfg.title} ${isValue ? fmtVal(raw) : fmtMul(raw)}`,
      tooltipDesc: resolvePillTooltip(pr, cfg),
    };
  });
}

interface GridConfig {
  label: string;
  field: keyof PullRequestDetails;
  isCredibility?: boolean;
}

function resolveGridLabel(
  pr: PullRequestDetails,
  field: keyof PullRequestDetails,
  fallback: string,
): string {
  if (field !== 'labelMultiplier') return fallback;
  const hasLabel = pr.label != null && pr.label.length > 0;
  return hasLabel ? `Label (${pr.label})` : 'Label';
}

function buildGridEntry(
  pr: PullRequestDetails,
  cfg: GridConfig,
): MultiplierGridEntry {
  return {
    label: resolveGridLabel(pr, cfg.field, cfg.label),
    value: fmtGrid(pr[cfg.field] ?? '0'),
    ...(cfg.isCredibility ? { isCredibility: true } : {}),
  };
}

function buildDensityEntry(pr: PullRequestDetails): MultiplierGridEntry | null {
  if (pr.codeDensity == null) return null;
  return { label: 'Code Density', value: Number(pr.codeDensity).toFixed(2) };
}

const OPEN_GRID: GridConfig[] = [
  { label: 'Repo Weight', field: 'repoWeightMultiplier' },
  { label: 'Issue Bonus', field: 'issueMultiplier' },
];

const MERGED_GRID: GridConfig[] = [
  { label: 'Repo Weight', field: 'repoWeightMultiplier' },
  { label: 'Issue Bonus', field: 'issueMultiplier' },
  { label: 'Credibility', field: 'credibilityMultiplier', isCredibility: true },
  { label: 'Review Quality', field: 'reviewQualityMultiplier' },
  { label: 'Time Decay', field: 'timeDecayMultiplier' },
];

function appendOptionalEntries(
  entries: MultiplierGridEntry[],
  pr: PullRequestDetails,
): MultiplierGridEntry[] {
  if (pr.labelMultiplier != null)
    entries.push(
      buildGridEntry(pr, { label: 'Label', field: 'labelMultiplier' }),
    );
  const density = buildDensityEntry(pr);
  if (density) entries.push(density);
  return entries;
}

export function buildMultiplierGrid(
  pr: PullRequestDetails,
  isOpen: boolean,
): MultiplierGridEntry[] {
  const configs = isOpen ? OPEN_GRID : MERGED_GRID;
  const entries = configs.map((cfg) => buildGridEntry(pr, cfg));
  if (isOpen) entries.push({ label: 'Collateral %', value: '20%' });
  return appendOptionalEntries(entries, pr);
}
