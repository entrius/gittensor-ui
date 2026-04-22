import { describe, expect, it } from 'vitest';
import { normalizeArrayResponse } from '../api/ApiUtils';

describe('normalizeArrayResponse', () => {
  it('returns the payload when already an array', () => {
    expect(normalizeArrayResponse<number>([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('unwraps common array envelope keys', () => {
    expect(normalizeArrayResponse<number>({ items: [1, 2] })).toEqual([1, 2]);
    expect(normalizeArrayResponse<number>({ results: [3, 4] })).toEqual([3, 4]);
    expect(normalizeArrayResponse<number>({ data: [5] })).toEqual([5]);
    expect(normalizeArrayResponse<number>({ rows: [6] })).toEqual([6]);
  });

  it('returns an empty array for non-array payloads', () => {
    expect(normalizeArrayResponse<number>({ total: 10 })).toEqual([]);
    expect(normalizeArrayResponse<number>(null)).toEqual([]);
    expect(normalizeArrayResponse<number>('not-array')).toEqual([]);
  });
});
