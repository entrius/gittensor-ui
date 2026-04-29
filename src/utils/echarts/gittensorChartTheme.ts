import { alpha, type Theme } from '@mui/material/styles';
import { TEXT_OPACITY } from '../../theme';

export function echartsFontFamily(theme: Theme): string {
  const ff = theme.typography.fontFamily;
  return typeof ff === 'string' ? ff : '"JetBrains Mono", monospace';
}

export function echartsTransparentBackground() {
  return { backgroundColor: 'transparent' as const };
}

/** Tooltip chrome shared by axis-trigger charts (bars, lines). Merge with trigger, axisPointer, formatter. */
export function echartsAxisTooltipChrome(theme: Theme) {
  return {
    backgroundColor: theme.palette.surface.tooltip,
    borderColor: alpha(theme.palette.text.primary, 0.14),
    borderWidth: 1,
    textStyle: {
      color: theme.palette.text.primary,
      fontFamily: echartsFontFamily(theme),
    },
  };
}

/** Tooltip chrome for pie / item charts. Merge with trigger, formatter. */
export function echartsItemTooltipChrome(theme: Theme) {
  return {
    confine: true,
    backgroundColor: theme.palette.surface.tooltip,
    borderColor: alpha(theme.palette.text.primary, 0.15),
    borderWidth: 1,
    textStyle: {
      color: theme.palette.text.primary,
      fontFamily: echartsFontFamily(theme),
    },
  };
}

export function echartsStrongAxisLabelColor(theme: Theme) {
  return alpha(theme.palette.common.white, 0.85);
}

export function echartsMutedCartesianAxisColors(theme: Theme) {
  return {
    labelColor: alpha(theme.palette.text.primary, 0.64),
    axisLineColor: alpha(theme.palette.text.primary, 0.08),
    splitLineColor: alpha(theme.palette.text.primary, 0.07),
  };
}

export function echartsGridBarWithTitle() {
  return {
    left: '3%',
    right: '3%',
    bottom: '10%',
    top: '20%',
    containLabel: true,
  };
}

export function echartsGridBarPaged() {
  return {
    left: '3%',
    right: '3%',
    bottom: '18%',
    top: '18%',
    containLabel: true,
  };
}

export function echartsGridLineChart() {
  return {
    left: '3%',
    right: '2%',
    top: 20,
    bottom: 28,
    containLabel: true,
  };
}

export function echartsBarChartTitle(
  theme: Theme,
  text: string,
  subtext: string,
) {
  return {
    text,
    subtext,
    left: 'center' as const,
    top: 20,
    textStyle: {
      color: theme.palette.text.primary,
      fontFamily: echartsFontFamily(theme),
      fontSize: 18,
      fontWeight: 600,
    },
    subtextStyle: {
      color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
      fontFamily: echartsFontFamily(theme),
      fontSize: 12,
    },
  };
}

export function echartsRadarChrome(theme: Theme) {
  return {
    axisName: {
      color: alpha(theme.palette.common.white, TEXT_OPACITY.secondary),
      fontSize: 9,
      lineHeight: 12,
    },
    splitLine: {
      lineStyle: {
        color: Array(5).fill(alpha(theme.palette.common.white, 0.05)),
      },
    },
    splitArea: { show: false },
    axisLine: {
      lineStyle: { color: alpha(theme.palette.common.white, 0.1) },
    },
  };
}
