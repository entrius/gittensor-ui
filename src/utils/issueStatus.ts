import { alpha, type Theme } from '@mui/material/styles';
import { STATUS_COLORS } from '../theme';

export interface IssueStatusMeta {
  bgColor: string;
  borderColor: string;
  color: string;
  text: string;
  tone: 'warning' | 'info' | 'merged' | 'error' | 'open';
}

type StatusPalette = Theme['palette']['status'];

const FALLBACK: StatusPalette = STATUS_COLORS as unknown as StatusPalette;

/**
 * Build status badge metadata using the theme's live status palette so colors
 * match the active mode (light / dark). Pass `theme.palette.status` as the
 * second argument — it falls back to the dark-mode STATUS_COLORS constants for
 * backwards-compatible static call sites.
 */
export const getIssueStatusMeta = (
  status: string,
  palette: StatusPalette = FALLBACK,
): IssueStatusMeta => {
  switch (status) {
    case 'registered':
      return {
        bgColor: alpha(palette.warning, 0.15),
        borderColor: alpha(palette.warning, 0.4),
        color: palette.warning,
        text: 'Pending',
        tone: 'warning',
      };
    case 'active':
      return {
        bgColor: alpha(palette.info, 0.15),
        borderColor: alpha(palette.info, 0.4),
        color: palette.info,
        text: 'Available',
        tone: 'info',
      };
    case 'completed':
      return {
        bgColor: alpha(palette.merged, 0.15),
        borderColor: alpha(palette.merged, 0.4),
        color: palette.merged,
        text: 'Completed',
        tone: 'merged',
      };
    case 'cancelled':
      return {
        bgColor: alpha(palette.error, 0.15),
        borderColor: alpha(palette.error, 0.4),
        color: palette.error,
        text: 'Cancelled',
        tone: 'error',
      };
    default:
      return {
        bgColor: alpha(palette.open, 0.15),
        borderColor: alpha(palette.open, 0.4),
        color: palette.open,
        text: status,
        tone: 'open',
      };
  }
};

/** Convenience wrapper: pulls the full status palette out of the active MUI theme. */
export const getIssueStatusMetaForTheme = (
  status: string,
  theme: Theme,
): IssueStatusMeta => getIssueStatusMeta(status, theme.palette.status);

export const getBountyAmountColor = (
  status: string,
  mutedColor: string,
  palette: StatusPalette = FALLBACK,
): string => {
  switch (status) {
    case 'active':
    case 'completed':
      return palette.merged;
    case 'registered':
      return palette.warning;
    default:
      return mutedColor;
  }
};
