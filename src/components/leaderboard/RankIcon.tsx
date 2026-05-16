import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { RANK_COLORS } from '../../theme';

interface RankIconProps {
  /** 1-based rank; 1/2/3 receive the podium treatment. */
  rank: number;
  /** 'sm' (22px / 0.65rem) — default; 'md' (28px / 0.7rem). */
  size?: 'sm' | 'md';
}

const SIZES = {
  sm: { box: '22px', font: '0.65rem' },
  md: { box: '28px', font: '0.7rem' },
} as const;

const getRankColor = (rank: number) => {
  if (rank === 1) return RANK_COLORS.first;
  if (rank === 2) return RANK_COLORS.second;
  if (rank === 3) return RANK_COLORS.third;
  return null;
};

export const RankIcon: React.FC<RankIconProps> = ({ rank, size = 'sm' }) => {
  const color = getRankColor(rank);
  const { box, font } = SIZES[size];

  return (
    <Box
      sx={{
        backgroundColor: 'background.default',
        borderRadius: '2px',
        width: box,
        height: box,
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
          fontSize: font,
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
