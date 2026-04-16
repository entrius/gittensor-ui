import { STATUS_COLORS } from '../theme';

export interface IssueStatusMeta {
  bgColor: string;
  color: string;
  borderColor: string;
  text: string;
  tone: 'warning' | 'info' | 'merged' | 'error' | 'open';
}

export const getIssueStatusMeta = (status: string): IssueStatusMeta => {
  switch (status) {
    case 'registered':
      return {
        bgColor: 'rgba(245, 158, 11, 0.15)',
        color: STATUS_COLORS.warning,
        borderColor: 'rgba(245, 158, 11, 0.4)',
        text: 'Pending',
        tone: 'warning',
      };
    case 'open':
      return {
        bgColor: 'rgba(139, 148, 158, 0.15)',
        color: STATUS_COLORS.open,
        borderColor: 'rgba(139, 148, 158, 0.4)',
        text: 'Open',
        tone: 'open',
      };
    case 'active':
      return {
        bgColor: 'rgba(88, 166, 255, 0.15)',
        color: STATUS_COLORS.info,
        borderColor: 'rgba(88, 166, 255, 0.4)',
        text: 'Available',
        tone: 'info',
      };
    case 'completed':
    case 'merged':
      return {
        bgColor: 'rgba(63, 185, 80, 0.15)',
        color: STATUS_COLORS.merged,
        borderColor: 'rgba(63, 185, 80, 0.4)',
        text: 'Completed',
        tone: 'merged',
      };
    case 'cancelled':
    case 'closed':
      return {
        bgColor: 'rgba(239, 68, 68, 0.15)',
        color: STATUS_COLORS.error,
        borderColor: 'rgba(239, 68, 68, 0.4)',
        text: 'Cancelled',
        tone: 'error',
      };
    default:
      return {
        bgColor: 'rgba(139, 148, 158, 0.15)',
        color: STATUS_COLORS.open,
        borderColor: 'rgba(139, 148, 158, 0.4)',
        text: status,
        tone: 'open',
      };
  }
};

/**
 * Returns the color for displaying a bounty amount based on its status.
 *
 * @param status        - The bounty status string (e.g. 'active', 'registered', 'completed', 'cancelled').
 * @param mutedFallback - When true, always returns a muted/secondary color regardless of status.
 *                        Pass `false` to get the full-saturation accent color for active/registered states.
 */
export const getBountyAmountColor = (
  status: string,
  mutedFallback: boolean,
): string => {
  if (mutedFallback) {
    return 'rgba(125, 125, 125, 1)';
  }
  switch (status) {
    case 'active':
      return STATUS_COLORS.merged;
    case 'registered':
      return STATUS_COLORS.warning;
    case 'completed':
      return STATUS_COLORS.merged;
    case 'cancelled':
    default:
      return 'rgba(125, 125, 125, 1)';
  }
};
