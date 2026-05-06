import { type GeneralConfigResponse } from '../../api/models';
import { parseNumber } from '../../utils';

export const PR_LOOKBACK_DAYS = 35;
const CURVE_RESOLUTION_DAYS = 0.25;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DecayParams {
  graceHours: number;
  midpoint: number;
  steepness: number;
  floor: number;
}

export interface DecayProjectionInput {
  mergedAt: string | null;
  prState: string;
  timeDecayMultiplier?: string | number | null;
  earnedScore?: string | number | null;
  nowMs?: number;
}

export interface DecayProjection {
  isMerged: boolean;
  inWindow: boolean;
  daysSinceMerge: number | null;
  /** Curve multiplier at days since merge (matches the drawn line). */
  chartNowMultiplier: number | null;
  /** Subnet-reported multiplier (used to back-derive pre-decay score). */
  currentMultiplier: number | null;
  preDecayScore: number | null;
  chartNowScore: number | null;
}

const DEFAULT_PARAMS: DecayParams = {
  graceHours: 12,
  midpoint: 10,
  steepness: 0.4,
  floor: 0.05,
};

export function resolveDecayParams(
  config?: GeneralConfigResponse | null,
): DecayParams {
  const cfg = config?.repositoryPrScoring;
  return {
    graceHours: cfg?.timeDecayGracePeriodHours ?? DEFAULT_PARAMS.graceHours,
    midpoint: cfg?.timeDecaySigmoidMidpoint ?? DEFAULT_PARAMS.midpoint,
    steepness: cfg?.timeDecaySigmoidSteepnessScalar ?? DEFAULT_PARAMS.steepness,
    floor: cfg?.timeDecayMinMultiplier ?? DEFAULT_PARAMS.floor,
  };
}

export function decayAt(days: number, params: DecayParams): number {
  if (days <= params.graceHours / 24) return 1;
  const sigmoid =
    1 / (1 + Math.exp(params.steepness * (days - params.midpoint)));
  return Math.max(sigmoid, params.floor);
}

export function buildDecayCurve(params: DecayParams): [number, number][] {
  const points: [number, number][] = [];
  for (let day = 0; day <= PR_LOOKBACK_DAYS; day += CURVE_RESOLUTION_DAYS) {
    points.push([+day.toFixed(2), +decayAt(day, params).toFixed(4)]);
  }
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

function isWithinLookbackWindow(daysSinceMerge: number | null): boolean {
  if (daysSinceMerge == null) return false;
  return daysSinceMerge <= PR_LOOKBACK_DAYS;
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
  return {
    isMerged,
    inWindow: isWithinLookbackWindow(daysSinceMerge),
    daysSinceMerge,
    chartNowMultiplier,
    currentMultiplier,
    preDecayScore,
    chartNowScore: applyMultiplier(preDecayScore, chartNowMultiplier),
  };
}

export function buildDecaySubline(projection: DecayProjection): string {
  if (!projection.isMerged) return 'Open PRs hold full score until merged.';
  if (projection.daysSinceMerge == null) return '';
  if (projection.daysSinceMerge > PR_LOOKBACK_DAYS) {
    return `Outside ${PR_LOOKBACK_DAYS}-day scoring window.`;
  }
  return `${projection.daysSinceMerge.toFixed(1)} days since merge`;
}
