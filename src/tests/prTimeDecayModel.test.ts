import { describe, expect, it } from 'vitest';
import {
  PR_LOOKBACK_DAYS,
  buildDecayCurve,
  buildDecayProjection,
  decayAt,
  resolveDecayParams,
  type DecayParams,
} from '../components/prs/prTimeDecayModel';

const params: DecayParams = {
  graceHours: 12,
  midpoint: 10,
  steepness: 0.4,
  floor: 0.05,
};

describe('prTimeDecayModel', () => {
  it('falls back to canonical defaults when config is missing', () => {
    expect(resolveDecayParams(undefined)).toEqual(params);
  });

  it('honors grace, sigmoid midpoint, and floor', () => {
    expect(decayAt(0, params)).toBe(1);
    expect(decayAt(0.5, params)).toBe(1);
    expect(decayAt(10, params)).toBeCloseTo(0.5, 4);
    expect(decayAt(35, params)).toBe(params.floor);
  });

  it('builds a curve spanning the lookback window', () => {
    const curve = buildDecayCurve(params);
    expect(curve[0]).toEqual([0, 1]);
    expect(curve[curve.length - 1]).toEqual([PR_LOOKBACK_DAYS, params.floor]);
  });

  it('back-derives pre-decay score from the subnet multiplier', () => {
    const nowMs = Date.parse('2026-04-29T12:00:00Z');
    const projection = buildDecayProjection(
      {
        mergedAt: '2026-04-24T12:00:00Z',
        prState: 'MERGED',
        timeDecayMultiplier: '0.8',
        earnedScore: 8,
        nowMs,
      },
      params,
    );
    expect(projection.daysSinceMerge).toBe(5);
    expect(projection.currentMultiplier).toBe(0.8);
    expect(projection.preDecayScore).toBe(10);
    expect(projection.chartNowMultiplier).toBeCloseTo(decayAt(5, params));
    expect(projection.chartNowScore).toBeCloseTo(10 * decayAt(5, params));
  });

  it('flags out-of-window PRs and treats unmerged PRs as pre-decay', () => {
    const nowMs = Date.parse('2026-04-29T00:00:00Z');
    const old = new Date(nowMs - 40 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      buildDecayProjection(
        {
          mergedAt: old,
          prState: 'MERGED',
          timeDecayMultiplier: '0.05',
          nowMs,
        },
        params,
      ).inWindow,
    ).toBe(false);
    const open = buildDecayProjection(
      { mergedAt: null, prState: 'OPEN', earnedScore: 12 },
      params,
    );
    expect(open.isMerged).toBe(false);
    expect(open.chartNowMultiplier).toBe(null);
    expect(open.preDecayScore).toBe(null);
  });
});
