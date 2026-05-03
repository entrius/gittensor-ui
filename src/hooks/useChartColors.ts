import { useTheme } from '@mui/material';
import { CHART_COLORS } from '../theme';
import { getChartSegmentColors } from '../utils/themeUtils';

export interface ChartColors {
  merged: string;
  open: string;
  closed: string;
  series: readonly string[];
}

/** Returns theme-aware chart segment colors plus the series palette. */
export function useChartColors(): ChartColors {
  const theme = useTheme();
  const [merged, open, closed] = getChartSegmentColors(theme);
  return { merged, open, closed, series: CHART_COLORS.series };
}
