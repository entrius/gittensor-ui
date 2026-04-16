import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { RANK_COLORS } from '../../theme';

const getRankColor = (rank: number) => {
  if (rank === 1) return RANK_COLORS.first;
  if (rank === 2) return RANK_COLORS.second;
  if (rank === 3) return RANK_COLORS.third;
  return null;
};

export const RankIcon: React.FC<{ rank: number }> = ({ rank }) => {
  const color = getRankColor(rank);

  return (
    <Box
      sx={{
        backgroundColor: 'background.default',
        borderRadius: '2px',
        width: '22px',
        height: '22px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: '1px solid',
        borderColor: color ? alpha(color, 0.4) : 'border.light',
        boxShadow: color
          ? `0 0 12px ${alpha(color, 0.4)}, 0 0 4px ${alpha(color, 0.2)}`
          : 'none',
      }}
    >
      <Typography
        component="span"
        sx={{
          color: color ?? 'text.secondary',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.65rem',
          fontWeight: 600,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {rank}
      </Typography>
    </Box>
  );
};
