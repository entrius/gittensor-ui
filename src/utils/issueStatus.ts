import { alpha } from '@mui/material/styles';
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
        bgColor: alpha(STATUS_COLORS.warning, 0.15),
        borderColor: alpha(STATUS_COLORS.warning, 0.4),
        color: STATUS_COLORS.warning,
        text: 'Pending',
        tone: 'warning',
      };
    case 'active':
      return {
        bgColor: alpha(STATUS_COLORS.info, 0.15),
        borderColor: alpha(STATUS_COLORS.info, 0.4),
        color: STATUS_COLORS.info,
        text: 'Available',
        tone: 'info',
      };
    case 'completed':
      return {
        bgColor: alpha(STATUS_COLORS.merged, 0.15),
        borderColor: alpha(STATUS_COLORS.merged, 0.4),
        color: STATUS_COLORS.merged,
        text: 'Completed',
        tone: 'merged',
      };
    case 'cancelled':
      return {
        bgColor: alpha(STATUS_COLORS.error, 0.15),
        borderColor: alpha(STATUS_COLORS.error, 0.4),
        color: STATUS_COLORS.error,
        text: 'Cancelled',
        tone: 'error',
      };
    default:
      return {
        bgColor: alpha(STATUS_COLORS.open, 0.15),
        borderColor: alpha(STATUS_COLORS.open, 0.4),
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
