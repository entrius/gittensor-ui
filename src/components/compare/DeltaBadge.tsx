import React from 'react';
import { Box, Typography } from '@mui/material';
import { STATUS_COLORS } from '../../theme';

interface DeltaBadgeProps {
  value: number | null;
  /** Label shown before the number, e.g. "rank" renders as "▲ rank +3" */
  label?: string;
  /** Format the number — defaults to rounding to 2 decimals */
  format?: (n: number) => string;
  /** Invert colors: negative = good (e.g. rank decrease is an improvement) */
  invertColor?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
}

const defaultFormat = (n: number): string => {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
};

export const DeltaBadge: React.FC<DeltaBadgeProps> = ({
  value,
  label,
  format = defaultFormat,
  invertColor = false,
  size = 'small',
}) => {
  if (value === null || value === 0) return null;

  const isPositive = value > 0;
  const isGood = invertColor ? !isPositive : isPositive;
  const arrow = isPositive ? '▲' : '▼';
  const color = isGood ? STATUS_COLORS.success : STATUS_COLORS.error;
  const fontSize = size === 'medium' ? '0.75rem' : '0.65rem';

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.3,
        px: 0.6,
        py: 0.15,
        borderRadius: 1,
        backgroundColor: `${color}18`,
        color,
        fontSize,
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      <Typography
        component="span"
        sx={{ fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 1 }}
      >
        {arrow}
      </Typography>
      {label && (
        <Typography
          component="span"
          sx={{ fontSize: 'inherit', fontWeight: 500, lineHeight: 1 }}
        >
          {label}
        </Typography>
      )}
      <Typography
        component="span"
        sx={{ fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 1 }}
      >
        {isPositive ? '+' : ''}
        {format(value)}
      </Typography>
    </Box>
  );
};
