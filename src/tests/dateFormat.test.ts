import { describe, expect, it } from 'vitest';
import { formatIsoDateOnlyForDisplay } from '../utils/dateFormat';

describe('formatIsoDateOnlyForDisplay', () => {
  it('formats a valid date-only string to a stable calendar date label', () => {
    expect(formatIsoDateOnlyForDisplay('2026-04-21')).toBe('Apr 21, 2026');
  });

  it('returns the original value for invalid date formats', () => {
    expect(formatIsoDateOnlyForDisplay('2026/04/21')).toBe('2026/04/21');
    expect(formatIsoDateOnlyForDisplay('invalid-date')).toBe('invalid-date');
  });

  it('returns the original value for out-of-range month/day values', () => {
    expect(formatIsoDateOnlyForDisplay('2026-13-21')).toBe('2026-13-21');
    expect(formatIsoDateOnlyForDisplay('2026-04-32')).toBe('2026-04-32');
  });
});
