import { type GeneralConfigResponse } from '../../api/models';
import { type RepositoryConfig } from '../../api/models/Dashboard';
import { parseNumber } from '../../utils';

/** PR scoring window used when neither the repo nor global config supplies one. */
const DEFAULT_LOOKBACK_DAYS = 30;
const CURVE_RESOLUTION_DAYS = 0.25;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DecayParams {
  graceHours: number;
  midpoint: number;
  steepness: number;
  floor: number;
  /** Rolling window of days a merged PR keeps earning score — the x-axis domain. */
  lookbackDays: number;
}

interface DecayProjectionInput {
  mergedAt: string | null;
  prState: string;
  timeDecayMultiplier?: string | number | null;
  earnedScore?: string | number | null;
  nowMs?: number;
}

export interface DecayProjection {
  isMerged: boolean;
  inWindow: boolean;
  /** Resolved lookback window for this PR's repo (drives the subline copy). */
  lookbackDays: number;
  daysSinceMerge: number | null;
  /** Curve multiplier at days since merge (matches the drawn line). */
  chartNowMultiplier: number | null;
  /** Subnet-reported multiplier (used to back-derive pre-decay score). */
  currentMultiplier: number | null;
  /** Multiplier to display — the subnet value wins when the curve disagrees. */
  nowMultiplier: number | null;
  /** True when the subnet-reported multiplier contradicts the local curve. */
  curveMismatch: boolean;
  preDecayScore: number | null;
  chartNowScore: number | null;
}

/**
 * Subnet multipliers arrive rounded to 2dp, so small drift from the local
 * curve is expected; beyond this the curve params must be wrong (e.g. the
 * repo config failed to load) and the subnet value is authoritative.
 */
const NOW_MULTIPLIER_TOLERANCE = 0.05;

const DEFAULT_PARAMS: DecayParams = {
  graceHours: 12,
  midpoint: 10,
  steepness: 0.4,
  floor: 0.05,
  lookbackDays: DEFAULT_LOOKBACK_DAYS,
};

/** First finite number among the candidates, else the fallback. */
function firstFinite(candidates: unknown[], fallback: number): number {
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return fallback;
}

/**
 * Resolve the time-decay curve params for a PR's repository. Each knob
 * resolves per-repo override → global config → static default, so a repo
 * that sets `scoring.time_decay` (or `scoring.pr_lookback_days`) bends the
 * chart while every other knob falls back to the subnet-wide config.
 */
export function resolveDecayParams(
  generalConfig?: GeneralConfigResponse | null,
  repoConfig?: RepositoryConfig | null,
): DecayParams {
  const global = generalConfig?.repositoryPrScoring;
  const scoring = repoConfig?.scoring;
  const timeDecay = scoring?.time_decay;
  return {
    graceHours: firstFinite(
      [timeDecay?.grace_period_hours, global?.timeDecayGracePeriodHours],
      DEFAULT_PARAMS.graceHours,
    ),
    midpoint: firstFinite(
      [timeDecay?.sigmoid_midpoint_days, global?.timeDecaySigmoidMidpoint],
      DEFAULT_PARAMS.midpoint,
    ),
    steepness: firstFinite(
      [timeDecay?.sigmoid_steepness, global?.timeDecaySigmoidSteepnessScalar],
      DEFAULT_PARAMS.steepness,
    ),
    floor: firstFinite(
      [timeDecay?.min_multiplier, global?.timeDecayMinMultiplier],
      DEFAULT_PARAMS.floor,
    ),
    lookbackDays: firstFinite(
      [scoring?.pr_lookback_days],
      DEFAULT_PARAMS.lookbackDays,
    ),
  };
}

function decayAt(days: number, params: DecayParams): number {
  if (days <= params.graceHours / 24) return 1;
  const sigmoid =
    1 / (1 + Math.exp(params.steepness * (days - params.midpoint)));
  return Math.max(sigmoid, params.floor);
}

export function buildDecayCurve(params: DecayParams): [number, number][] {
  const points: [number, number][] = [];
  for (let day = 0; day < params.lookbackDays; day += CURVE_RESOLUTION_DAYS) {
    points.push([+day.toFixed(2), +decayAt(day, params).toFixed(4)]);
  }
  // Anchor the final point exactly at the lookback edge — the loop step may
  // not land there for a non-multiple-of-resolution window.
  points.push([
    +params.lookbackDays.toFixed(2),
    +decayAt(params.lookbackDays, params).toFixed(4),
  ]);
  return points;
}

function computeDaysSinceMerge(
  isMerged: boolean,
  mergedAt: string | null,
  nowMs: number,
): number | null {
  if (!isMerged || !mergedAt) return null;
  return Math.max(0, (nowMs - new Date(mergedAt).getTime()) / MS_PER_DAY);
}

function parseMultiplierValue(
  raw: string | number | null | undefined,
): number | null {
  if (raw == null) return null;
  return parseNumber(raw);
}

function backDerivePreDecayScore(
  isMerged: boolean,
  earned: number,
  denominator: number | null,
): number | null {
  if (!isMerged || earned <= 0) return null;
  if (denominator == null || denominator <= 0) return null;
  return earned / denominator;
}

function applyMultiplier(
  score: number | null,
  multiplier: number | null,
): number | null {
  if (score == null || multiplier == null) return null;
  return score * multiplier;
}

function isWithinLookbackWindow(
  daysSinceMerge: number | null,
  lookbackDays: number,
): boolean {
  if (daysSinceMerge == null) return false;
  return daysSinceMerge <= lookbackDays;
}

export function buildDecayProjection(
  input: DecayProjectionInput,
  params: DecayParams,
): DecayProjection {
  const { mergedAt, prState, timeDecayMultiplier, earnedScore, nowMs } = input;
  const isMerged = prState === 'MERGED' && !!mergedAt;
  const daysSinceMerge = computeDaysSinceMerge(
    isMerged,
    mergedAt,
    nowMs ?? Date.now(),
  );
  const chartNowMultiplier =
    daysSinceMerge != null ? decayAt(daysSinceMerge, params) : null;
  const currentMultiplier = parseMultiplierValue(timeDecayMultiplier);
  const earned = earnedScore == null ? 0 : parseNumber(earnedScore);
  const preDecayScore = backDerivePreDecayScore(
    isMerged,
    earned,
    currentMultiplier ?? chartNowMultiplier,
  );
  const curveMismatch =
    currentMultiplier != null &&
    chartNowMultiplier != null &&
    Math.abs(currentMultiplier - chartNowMultiplier) > NOW_MULTIPLIER_TOLERANCE;
  const nowMultiplier = curveMismatch ? currentMultiplier : chartNowMultiplier;
  return {
    isMerged,
    inWindow: isWithinLookbackWindow(daysSinceMerge, params.lookbackDays),
    lookbackDays: params.lookbackDays,
    daysSinceMerge,
    chartNowMultiplier,
    currentMultiplier,
    nowMultiplier,
    curveMismatch,
    preDecayScore,
    chartNowScore: applyMultiplier(preDecayScore, nowMultiplier),
  };
}

export function buildDecaySubline(projection: DecayProjection): string {
  if (!projection.isMerged) return 'Open PRs hold full score until merged.';
  if (projection.daysSinceMerge == null) return '';
  if (projection.daysSinceMerge > projection.lookbackDays) {
    return `Outside ${projection.lookbackDays}-day scoring window.`;
  }
  const base = `${projection.daysSinceMerge.toFixed(1)} day(s) since merge`;
  return projection.curveMismatch
    ? `${base} · showing subnet-reported multiplier (curve is approximate)`
    : base;
}
