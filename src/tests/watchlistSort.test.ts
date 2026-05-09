import { describe, it, expect } from 'vitest';
import { compareByWatchlist } from '../utils/watchlistSort';

describe('compareByWatchlist', () => {
  type Row = { key?: string };
  const watched = new Set(['a', 'c']);
  const isWatched = (k: string) => watched.has(k);
  const getKey = (row: Row) => row.key;

  it('treats undefined keys as not watched', () => {
    const result = compareByWatchlist(
      { key: undefined } as Row,
      { key: 'a' } as Row,
      getKey,
      isWatched,
    );
    expect(result).toBeLessThan(0);
  });

  it('puts watched rows on top under desc multiplier', () => {
    const rows: Row[] = [
      { key: 'b' },
      { key: 'a' },
      { key: 'd' },
      { key: 'c' },
    ];
    const sorted = [...rows].sort(
      (a, b) => compareByWatchlist(a, b, getKey, isWatched) * -1,
    );
    expect(
      sorted
        .slice(0, 2)
        .map((r) => r.key)
        .sort(),
    ).toEqual(['a', 'c']);
    expect(sorted.slice(2).every((r) => !watched.has(r.key ?? ''))).toBe(true);
  });

  it('puts unwatched rows on top under asc multiplier', () => {
    const rows: Row[] = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
    const sorted = [...rows].sort((a, b) =>
      compareByWatchlist(a, b, getKey, isWatched),
    );
    expect(sorted[0].key).toBe('b');
  });

  it('preserves stable order between equally-watched rows', () => {
    const rows: Row[] = [
      { key: 'a' },
      { key: 'c' },
      { key: 'b' },
      { key: 'd' },
    ];
    const sorted = [...rows].sort(
      (a, b) => compareByWatchlist(a, b, getKey, isWatched) * -1,
    );
    expect(
      sorted
        .slice(0, 2)
        .map((r) => r.key)
        .join(','),
    ).toBe('a,c');
  });
});
