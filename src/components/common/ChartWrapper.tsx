import React, { type ReactNode } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';

interface ChartWrapperProps<T> {
  /** The data array the chart consumes. Wrapper checks length; empty → fallback. */
  data: readonly T[] | null | undefined;
  /** Optional predicate for more complex emptiness checks. */
  isEmpty?: (data: readonly T[]) => boolean;
  /** Message shown when the chart has no data. */
  emptyMessage?: string;
  /** Smaller hint under the primary message. */
  emptyHint?: string;
  /** Container height to match the chart's expected size. */
  height?: number | string;
  children: ReactNode;
}

export const ChartWrapper = <T,>({
  data,
  isEmpty,
  emptyMessage = 'No data to display',
  emptyHint,
  height,
  children,
}: ChartWrapperProps<T>) => {
  const theme = useTheme();

  const empty = !data || (isEmpty ? isEmpty(data) : data.length === 0);

  if (empty) {
    return (
      <Box
        sx={{
          height: height ?? '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          py: 4,
          color: 'text.secondary',
          border: `1px dashed ${alpha(theme.palette.common.white, 0.1)}`,
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.common.white, 0.02),
        }}
      >
        <InsertChartOutlinedIcon
          sx={{
            fontSize: 28,
            color: alpha(theme.palette.text.primary, 0.25),
          }}
        />
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            color: 'text.secondary',
          }}
        >
          {emptyMessage}
        </Typography>
        {emptyHint && (
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              color: (t) => alpha(t.palette.text.primary, 0.35),
              maxWidth: 320,
              textAlign: 'center',
            }}
          >
            {emptyHint}
          </Typography>
        )}
      </Box>
    );
  }

  return <>{children}</>;
};
