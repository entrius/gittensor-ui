import { STATUS_COLORS } from '../theme';

export interface IssueStatusMeta {
  bgColor: string;
  color: string;
  text: string;
  tone: 'warning' | 'info' | 'merged' | 'error' | 'open';
}

export const getIssueStatusMeta = (status: string): IssueStatusMeta => {
  switch (status) {
    case 'registered':
      return {
        bgColor: 'rgba(245, 158, 11, 0.15)',
        color: STATUS_COLORS.warning,
        text: 'Pending',
        tone: 'warning',
      };
    case 'active':
      return {
        bgColor: 'rgba(88, 166, 255, 0.15)',
        color: STATUS_COLORS.info,
        text: 'Available',
        tone: 'info',
      };
    case 'completed':
      return {
        bgColor: 'rgba(63, 185, 80, 0.15)',
        color: STATUS_COLORS.merged,
        text: 'Completed',
        tone: 'merged',
      };
    case 'cancelled':
      return {
        bgColor: 'rgba(239, 68, 68, 0.15)',
        color: STATUS_COLORS.error,
        text: 'Cancelled',
        tone: 'error',
      };
    default:
      return {
        bgColor: 'rgba(139, 148, 158, 0.15)',
        color: STATUS_COLORS.open,
        text: status,
        tone: 'open',
      };
  }
};
