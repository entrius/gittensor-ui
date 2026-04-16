import { describe, it, expect } from 'vitest';
import { selectQueryBranch } from '../components/common/QueryBoundary';

const makeQuery = <T>(overrides: {
  data?: T;
  isLoading?: boolean;
  isError?: boolean;
}) => ({
  data: overrides.data,
  isLoading: overrides.isLoading ?? false,
  isError: overrides.isError ?? false,
});

describe('selectQueryBranch', () => {
  it('returns "loading" when isLoading is true (even if data or error exist)', () => {
    expect(selectQueryBranch(makeQuery({ isLoading: true }))).toBe('loading');
    expect(
      selectQueryBranch(makeQuery({ isLoading: true, data: { id: 1 } })),
    ).toBe('loading');
    expect(
      selectQueryBranch(makeQuery({ isLoading: true, isError: true })),
    ).toBe('loading');
  });

  it('returns "error" when isError is true and not loading', () => {
    expect(selectQueryBranch(makeQuery({ isError: true }))).toBe('error');
  });

  it('returns "empty" when data is undefined', () => {
    expect(selectQueryBranch(makeQuery({}))).toBe('empty');
  });

  it('returns "empty" when data is null', () => {
    expect(selectQueryBranch(makeQuery({ data: null as unknown }))).toBe(
      'empty',
    );
  });

  it('returns "data" when data is present and no other branch wins', () => {
    expect(selectQueryBranch(makeQuery({ data: { id: 1 } }))).toBe('data');
  });

  it('respects the isEmpty predicate to route present data to "empty"', () => {
    const q = makeQuery({ data: [] as number[] });
    expect(selectQueryBranch(q)).toBe('data');
    expect(selectQueryBranch(q, (arr) => arr.length === 0)).toBe('empty');
  });

  it('does not call isEmpty when data is undefined', () => {
    let called = false;
    const predicate = () => {
      called = true;
      return false;
    };
    selectQueryBranch(makeQuery({}), predicate);
    expect(called).toBe(false);
  });

  it('preserves precedence: loading > error > empty > data', () => {
    // loading beats error
    expect(
      selectQueryBranch(makeQuery({ isLoading: true, isError: true })),
    ).toBe('loading');
    // error beats empty
    expect(selectQueryBranch(makeQuery({ isError: true }))).toBe('error');
    // empty beats data when predicate says so
    expect(
      selectQueryBranch(makeQuery({ data: [] as number[] }), (arr) => arr.length === 0),
    ).toBe('empty');
  });

  it('treats falsy-but-defined data (0, "", false) as data, not empty', () => {
    expect(selectQueryBranch(makeQuery({ data: 0 }))).toBe('data');
    expect(selectQueryBranch(makeQuery({ data: '' }))).toBe('data');
    expect(selectQueryBranch(makeQuery({ data: false }))).toBe('data');
  });
});
