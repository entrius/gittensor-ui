import { describe, expect, it } from 'vitest';
import { formatCountLabel, formatNounLabel } from '../utils/countCopy';

describe('formatNounLabel', () => {
  it('returns compact noun label by default', () => {
    expect(formatNounLabel({ singular: 'contribution' })).toBe('contribution(s)');
  });

  it('returns natural plural noun label in natural mode', () => {
    expect(
      formatNounLabel({
        singular: 'contribution',
        style: 'natural',
      }),
    ).toBe('contributions');
  });

  it('uses custom plural label when provided', () => {
    expect(
      formatNounLabel({
        singular: 'repository',
        plural: 'repositories',
        style: 'natural',
      }),
    ).toBe('repositories');
  });
});

describe('formatCountLabel', () => {
  it('returns compact count labels by default', () => {
    expect(formatCountLabel({ count: 1, singular: 'contribution' })).toBe(
      '1 contribution(s)',
    );
    expect(formatCountLabel({ count: 3, singular: 'contribution' })).toBe(
      '3 contribution(s)',
    );
  });

  it('returns natural singular/plural labels in natural mode', () => {
    expect(
      formatCountLabel({
        count: 1,
        singular: 'contribution',
        style: 'natural',
      }),
    ).toBe('1 contribution');
    expect(
      formatCountLabel({
        count: 3,
        singular: 'contribution',
        style: 'natural',
      }),
    ).toBe('3 contributions');
  });

  it('supports custom natural plural labels', () => {
    expect(
      formatCountLabel({
        count: 2,
        singular: 'repository',
        plural: 'repositories',
        style: 'natural',
      }),
    ).toBe('2 repositories');
  });
});
