import { alpha, type Theme } from '@mui/material/styles';
import { CHART_COLORS } from '../theme';

export interface ModeActiveTabOptions {
  activeColor?: string;
  darkAlpha?: number;
  darkHoverAlpha?: number;
}

export type ChartSegmentColors = [string, string, string];

export function modeActiveTabSx(
  theme: Theme,
  isActive: boolean,
  { activeColor, darkAlpha = 0.12, darkHoverAlpha }: ModeActiveTabOptions = {},
) {
  const isDark = theme.palette.mode === 'dark';
  const lightBg = activeColor ?? theme.palette.status.success;
  const bg = isDark ? alpha(theme.palette.text.primary, darkAlpha) : lightBg;
  const hoverBg = isDark
    ? alpha(theme.palette.text.primary, darkHoverAlpha ?? darkAlpha + 0.04)
    : lightBg;
  const activeText = isDark
    ? theme.palette.text.primary
    : theme.palette.common.white;
  return {
    backgroundColor: isActive ? bg : 'transparent',
    color: isActive ? activeText : theme.palette.text.secondary,
    '&:hover': {
      backgroundColor: isActive
        ? hoverBg
        : alpha(theme.palette.text.primary, 0.06),
      color: isActive ? activeText : theme.palette.text.primary,
    },
  };
}

/** Returns the primary positive-metric color for the current theme mode. */
export function getPositiveColor(theme: Theme): string {
  return theme.palette.mode === 'dark'
    ? theme.palette.status.merged
    : theme.palette.status.success;
}

/** Returns [merged, open, closed] chart colors resolved for the current theme mode. */
export function getChartSegmentColors(theme: Theme): ChartSegmentColors {
  const isDark = theme.palette.mode === 'dark';
  return [
    isDark ? CHART_COLORS.merged : theme.palette.status.success,
    isDark ? CHART_COLORS.open : theme.palette.border.light,
    isDark ? CHART_COLORS.closed : theme.palette.status.closed,
  ];
}
