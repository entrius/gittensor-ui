import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { TEXT_OPACITY } from '../../theme';

/** True if any value is a finite number greater than zero. */
export function chartNumericSeriesHasPositive(
  values: readonly number[],
): boolean {
  return values.some(
    (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
  );
}

export interface ChartEmptyPanelProps {
  /** When true, children are hidden and the empty state is shown instead. */
  empty: boolean;
  title: string;
  hint?: string;
  minHeight?: number | string;
  /** Ignored when `empty` is true. */
  children?: React.ReactNode;
  emptyAriaLabel?: string;
}

/**
 * When chart inputs are empty (or all zero), show an explicit empty state so
 * users do not read ECharts placeholders as real scores.
 */
export const ChartEmptyPanel: React.FC<ChartEmptyPanelProps> = ({
  empty,
  title,
  hint,
  minHeight = 200,
  children,
  emptyAriaLabel = 'Chart has no data to display',
}) => {
  const theme = useTheme();

  if (!empty) return <>{children}</>;

  return (
    <Box
      role="status"
      aria-label={emptyAriaLabel}
      sx={{
        minHeight,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 3,
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'border.light',
        backgroundColor: 'surface.subtle',
        boxSizing: 'border-box',
      }}
    >
      <InsightsOutlinedIcon
        sx={{
          fontSize: 40,
          color: alpha(theme.palette.text.primary, 0.22),
          mb: 1,
        }}
        aria-hidden
      />
      <Typography
        variant="subtitle2"
        sx={{
          color: 'text.primary',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        {title}
      </Typography>
      {hint ? (
        <Typography
          variant="caption"
          sx={{
            mt: 0.75,
            maxWidth: 320,
            textAlign: 'center',
            color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
            lineHeight: 1.45,
          }}
        >
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
};
