import { type IssueBounty } from '../../api/models/Issues';
import { STATUS_COLORS } from '../../theme';

export type IssueStatusBadge = {
  color: string;
  bgColor: string;
  text: string;
};

export const getIssueStatusBadge = (
  status: IssueBounty['status'] | string,
): IssueStatusBadge => {
  switch (status) {
    case 'registered':
      return {
        color: STATUS_COLORS.warning,
        bgColor: 'rgba(245, 158, 11, 0.15)',
        text: 'Pending',
      };
    case 'active':
      return {
        color: STATUS_COLORS.info,
        bgColor: 'rgba(88, 166, 255, 0.15)',
        text: 'Available',
      };
    case 'completed':
      return {
        color: STATUS_COLORS.merged,
        bgColor: 'rgba(63, 185, 80, 0.15)',
        text: 'Completed',
      };
    case 'cancelled':
      return {
        color: STATUS_COLORS.error,
        bgColor: 'rgba(239, 68, 68, 0.15)',
        text: 'Cancelled',
      };
    default:
      return {
        color: STATUS_COLORS.open,
        bgColor: 'rgba(139, 148, 158, 0.15)',
        text: status,
      };
  }
};

export const formatIssueDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatIssueUsdEstimate = (
  alphaAmount: string | number | null | undefined,
  taoPrice: number,
  alphaPrice: number,
): string | null => {
  if (taoPrice <= 0 || alphaPrice <= 0) return null;

  const amount =
    typeof alphaAmount === 'string'
      ? parseFloat(alphaAmount)
      : (alphaAmount ?? NaN);
  if (isNaN(amount) || amount === 0) return null;

  const usd = amount * alphaPrice * taoPrice;
  return `~${usd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })}`;
};
