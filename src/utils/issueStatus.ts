import { STATUS_COLORS } from '../theme';

export interface IssueStatusMeta {
  bgColor: string;
  borderColor: string;
  color: string;
  text: string;
  tone: 'warning' | 'info' | 'merged' | 'error' | 'open';
}

export const getIssueStatusMeta = (status: string): IssueStatusMeta => {
  switch (status) {
    case 'registered':
      return {
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
        color: STATUS_COLORS.warning,
        text: 'Pending',
        tone: 'warning',
      };
    case 'open':
      return {
        bgColor: 'rgba(139, 148, 158, 0.15)',
        borderColor: 'rgba(139, 148, 158, 0.4)',
        color: STATUS_COLORS.open,
        text: 'Open',
        tone: 'open',
      };
    case 'active':
      return {
        bgColor: 'rgba(88, 166, 255, 0.15)',
        borderColor: 'rgba(88, 166, 255, 0.4)',
        color: STATUS_COLORS.info,
        text: 'Available',
        tone: 'info',
      };
    case 'completed':
    case 'merged':
      return {
        bgColor: 'rgba(63, 185, 80, 0.15)',
        borderColor: 'rgba(63, 185, 80, 0.4)',
        color: STATUS_COLORS.merged,
        text: 'Completed',
        tone: 'merged',
      };
    case 'cancelled':
    case 'closed':
      return {
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        color: STATUS_COLORS.error,
        text: 'Cancelled',
        tone: 'error',
      };
    default:
      return {
        bgColor: 'rgba(139, 148, 158, 0.15)',
        borderColor: 'rgba(139, 148, 158, 0.4)',
        color: STATUS_COLORS.open,
        text: status,
        tone: 'open',
      };
  }
};

export const getBountyAmountColor = (
  status: string,
  mutedColor: string,
): string => {
  switch (status) {
    case 'active':
    case 'completed':
      return STATUS_COLORS.merged;
    case 'registered':
      return STATUS_COLORS.warning;
    default:
      return mutedColor;
  }
};
