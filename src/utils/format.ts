/**
 * Format a USD estimate value for display.
 *
 * @param value - The USD value to format
 * @param options - Formatting options
 * @param options.includeApproxPrefix - Whether to include "~" prefix (default: false)
 * @param options.showZero - Whether to show "$0" for zero/negative values (default: false, returns null)
 * @returns Formatted string like "$5", "<$1", or null if value is invalid/zero
 */
export const formatUsdEstimate = (
  value: number | null | undefined,
  options?: { includeApproxPrefix?: boolean; showZero?: boolean },
): string | null => {
  const { includeApproxPrefix = false, showZero = false } = options ?? {};
  const prefix = includeApproxPrefix ? '~' : '';

  if (value === undefined || value === null) {
    return showZero ? `${prefix}$0` : null;
  }

  if (value >= 1) {
    return `${prefix}$${Math.round(value)}`;
  }

  if (value > 0) {
    return '<$1';
  }

  return showZero ? `${prefix}$0` : null;
};
