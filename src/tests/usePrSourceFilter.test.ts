import { describe, it, expect } from 'vitest';
import { parseSourceFilter } from '../hooks/usePrSourceFilter';

const all = () => new Set(['starred', 'miner', 'repo'] as const);

describe('parseSourceFilter', () => {
  it('defaults to all-on when storage is empty', () => {
    expect(parseSourceFilter(null)).toEqual(all());
  });

  it('round-trips a valid JSON array', () => {
    expect(parseSourceFilter('["starred"]')).toEqual(new Set(['starred']));
    expect(parseSourceFilter('["miner","repo"]')).toEqual(
      new Set(['miner', 'repo']),
    );
  });

  it('preserves an empty set when explicitly persisted', () => {
    expect(parseSourceFilter('[]')).toEqual(new Set());
  });

  it('drops unknown source strings', () => {
    expect(parseSourceFilter('["starred","unknown","miner"]')).toEqual(
      new Set(['starred', 'miner']),
    );
  });

  it('falls back to all-on for malformed JSON', () => {
    expect(parseSourceFilter('not json')).toEqual(all());
    expect(parseSourceFilter('{"starred":true}')).toEqual(all());
  });

  it('falls back to all-on for non-string values', () => {
    expect(parseSourceFilter(undefined)).toEqual(all());
    expect(parseSourceFilter(0)).toEqual(all());
    expect(parseSourceFilter(['starred'])).toEqual(all());
    expect(parseSourceFilter({})).toEqual(all());
  });

  it('drops non-string array entries without throwing', () => {
    expect(parseSourceFilter('[1,2,"starred"]')).toEqual(new Set(['starred']));
  });
});
