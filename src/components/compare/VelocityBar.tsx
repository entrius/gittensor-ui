import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { STATUS_COLORS } from '../../theme';

interface VelocityBarProps {
  /** This miner's velocity (pts/day) */
  velocity: number | null;
  /** Average velocity across all pinned miners */
  groupAverage: number | null;
  /** Max velocity in the group — used to scale the bar */
  groupMax: number | null;
}

export const VelocityBar: React.FC<VelocityBarProps> = ({
  velocity,
  groupAverage,
  groupMax,
}) => {
  if (velocity === null || groupMax === null || groupMax <= 0) {
    return (
      <Box
        sx={{ height: 6, borderRadius: 1, backgroundColor: 'border.light' }}
      />
    );
  }

  const pct = Math.max(0, Math.min(100, (velocity / groupMax) * 100));
  const isAboveAvg = groupAverage !== null && velocity > groupAverage;
  const color = isAboveAvg ? STATUS_COLORS.success : STATUS_COLORS.warning;

  const tooltipText = `${velocity.toFixed(2)} pts/day${
    groupAverage !== null ? ` (avg: ${groupAverage.toFixed(2)})` : ''
  }`;

  return (
    <Tooltip title={tooltipText} placement="top" arrow>
      <Box
        sx={{
          height: 6,
          borderRadius: 1,
          backgroundColor: 'border.light',
          overflow: 'hidden',
          cursor: 'help',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 1,
            backgroundColor: color,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </Box>
    </Tooltip>
  );
};

interface VelocityLabelProps {
  velocity: number | null;
}

export const VelocityLabel: React.FC<VelocityLabelProps> = ({ velocity }) => {
  if (velocity === null) return null;

  return (
    <Typography
      component="span"
      sx={{
        fontSize: '0.65rem',
        fontFamily: '"JetBrains Mono", monospace',
        color: velocity > 0 ? STATUS_COLORS.success : 'text.secondary',
        fontWeight: 600,
      }}
    >
      {velocity > 0 ? '+' : ''}
      {velocity.toFixed(2)} pts/day
    </Typography>
  );
};
