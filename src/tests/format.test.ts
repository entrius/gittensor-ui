import { describe, it, expect } from 'vitest';
import {
  formatTokenAmount,
  truncateText,
  formatDate,
  formatUsdEstimate,
  credibilityColor,
} from '../utils/format';
import { CREDIBILITY_COLORS } from '../theme';

describe('formatTokenAmount', () => {
  it('formats valid numbers with default 2 decimals', () => {
    expect(formatTokenAmount(100)).toBe('100.00');
    expect(formatTokenAmount(0)).toBe('0.00');
  });

  it('formats string values', () => {
    expect(formatTokenAmount('42.567')).toBe('42.57');
    expect(formatTokenAmount('0.1')).toBe('0.10');
  });

  it('returns "0" for null and undefined', () => {
    expect(formatTokenAmount(null)).toBe('0');
    expect(formatTokenAmount(undefined)).toBe('0');
  });

  it('returns "0" for NaN strings', () => {
    expect(formatTokenAmount('abc')).toBe('0');
    expect(formatTokenAmount('')).toBe('0');
  });

  it('respects custom decimal places', () => {
    expect(formatTokenAmount(3.14159, 4)).toBe('3.1416');
    expect(formatTokenAmount(10, 0)).toBe('10');
  });
});

describe('truncateText', () => {
  it('returns text unchanged if within maxLength', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('truncates with ellipsis when exceeding maxLength', () => {
    expect(truncateText('hello world', 5)).toBe('hello...');
  });

  it('returns text at exact boundary', () => {
    expect(truncateText('hello', 5)).toBe('hello');
  });

  it('returns empty string for falsy input', () => {
    expect(truncateText('', 10)).toBe('');
  });
});

describe('formatDate', () => {
  it('formats valid ISO date string', () => {
    expect(formatDate('2024-03-15T10:30:00Z')).toBe('Mar 15, 2024');
  });

  it('formats date-only string', () => {
    expect(formatDate('2024-01-01')).toBe('Jan 1, 2024');
  });

  it('returns "-" for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('returns "-" for undefined', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('returns "-" for empty string', () => {
    expect(formatDate('')).toBe('-');
  });
});

describe('formatUsdEstimate', () => {
  it('formats values >= 1 as whole dollars', () => {
    expect(formatUsdEstimate(5.5)).toBe('$6');
    expect(formatUsdEstimate(100)).toBe('$100');
  });

  it('returns "<$1" for values between 0 and 1', () => {
    expect(formatUsdEstimate(0.5)).toBe('<$1');
    expect(formatUsdEstimate(0.01)).toBe('<$1');
  });

  it('returns null for zero by default', () => {
    expect(formatUsdEstimate(0)).toBeNull();
  });

  it('returns null for null and undefined', () => {
    expect(formatUsdEstimate(null)).toBeNull();
    expect(formatUsdEstimate(undefined)).toBeNull();
  });

  it('returns "$0" for zero when showZero is true', () => {
    expect(formatUsdEstimate(0, { showZero: true })).toBe('$0');
  });

  it('returns "$0" for null when showZero is true', () => {
    expect(formatUsdEstimate(null, { showZero: true })).toBe('$0');
  });

  it('includes approx prefix when enabled', () => {
    expect(formatUsdEstimate(10, { includeApproxPrefix: true })).toBe('~$10');
  });

  it('includes approx prefix with showZero', () => {
    expect(
      formatUsdEstimate(0, { includeApproxPrefix: true, showZero: true }),
    ).toBe('~$0');
  });
});

describe('credibilityColor', () => {
  it('returns excellent for >= 0.9', () => {
    expect(credibilityColor(0.9)).toBe(CREDIBILITY_COLORS.excellent);
    expect(credibilityColor(1.0)).toBe(CREDIBILITY_COLORS.excellent);
  });

  it('returns good for >= 0.7', () => {
    expect(credibilityColor(0.7)).toBe(CREDIBILITY_COLORS.good);
    expect(credibilityColor(0.89)).toBe(CREDIBILITY_COLORS.good);
  });

  it('returns moderate for >= 0.5', () => {
    expect(credibilityColor(0.5)).toBe(CREDIBILITY_COLORS.moderate);
    expect(credibilityColor(0.69)).toBe(CREDIBILITY_COLORS.moderate);
  });

  it('returns low for >= 0.3', () => {
    expect(credibilityColor(0.3)).toBe(CREDIBILITY_COLORS.low);
    expect(credibilityColor(0.49)).toBe(CREDIBILITY_COLORS.low);
  });

  it('returns poor for < 0.3', () => {
    expect(credibilityColor(0.29)).toBe(CREDIBILITY_COLORS.poor);
    expect(credibilityColor(0)).toBe(CREDIBILITY_COLORS.poor);
  });
});
