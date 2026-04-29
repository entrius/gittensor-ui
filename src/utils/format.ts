import { format } from 'date-fns';
import { CREDIBILITY_COLORS } from '../theme';

/**
 * Format a token amount for display with specified decimal places.
 * Raw values are already in Alpha units - just round to specified decimals.
 *
 * @param value - The token amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "100.50"
 */
export const formatTokenAmount = (
  value: string | number | null | undefined,
  decimals: number = 2,
): string => {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format a USD estimate value for display.
 *
 * @param value - The USD value to format
 * @param options - Formatting options
 * @param options.includeApproxPrefix - Whether to include "~" prefix (default: false)
 * @param options.showZero - Whether to show "$0" for zero/negative values (default: false, returns null)
 * @returns Formatted string like "$5", "<$1", or null if value is invalid/zero
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'MMM d, yyyy');
};

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

/**
 * Convert an Alpha token amount to a formatted USD string using live prices.
 * Returns null when the amount is missing, zero, or prices are unavailable.
 */
export const formatAlphaToUsd = (
  alphaAmount: string | undefined,
  taoPrice: number,
  alphaPrice: number,
): string | null => {
  if (!alphaAmount) return null;
  const amount = parseFloat(alphaAmount);
  if (isNaN(amount) || amount === 0) return null;
  const usd = amount * alphaPrice * taoPrice;
  return `~${usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`;
};

export const credibilityColor = (cred: number): string => {
  if (cred >= 0.9) return CREDIBILITY_COLORS.excellent;
  if (cred >= 0.7) return CREDIBILITY_COLORS.good;
  if (cred >= 0.5) return CREDIBILITY_COLORS.moderate;
  if (cred >= 0.3) return CREDIBILITY_COLORS.low;
  return CREDIBILITY_COLORS.poor;
};
