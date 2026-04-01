import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { TIER_COLORS } from '../../theme';

interface RankBadgeProps {
  rank: number;
  displayNumber: number;
}

const getRankTierColor = (rank: number): string | null => {
  switch (rank) {
    case 0:
      return TIER_COLORS.gold;
    case 1:
      return TIER_COLORS.silver;
    case 2:
      return TIER_COLORS.bronze;
    default:
      return null;
  }
};

const getRankBorderColor = (rank: number, fallbackColor: string): string => {
  const tierColor = getRankTierColor(rank);
  if (tierColor) {
    return alpha(tierColor, 0.4);
  }
  return fallbackColor;
};

const getRankBoxShadow = (rank: number): string => {
  const tierColor = getRankTierColor(rank);
  if (tierColor) {
    return `0 0 12px ${alpha(tierColor, 0.4)}, 0 0 4px ${alpha(tierColor, 0.2)}`;
  }
  return 'none';
};

const getRankTextColor = (rank: number, fallbackColor: string): string => {
  const tierColor = getRankTierColor(rank);
  if (tierColor) {
    return tierColor;
  }
  return fallbackColor;
};

const RankBadge: React.FC<RankBadgeProps> = ({ rank, displayNumber }) => {
  const theme = useTheme();
  const defaultBorderColor = alpha(theme.palette.text.primary, 0.15);
  const defaultTextColor = alpha(theme.palette.text.primary, 0.6);

  return (
    <Box
      sx={{
        backgroundColor: 'background.default',
        borderRadius: '2px',
        width: '28px',
        height: '28px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: '1px solid',
        borderColor: getRankBorderColor(rank, defaultBorderColor),
        boxShadow: getRankBoxShadow(rank),
      }}
    >
      <Typography
        component="span"
        sx={{
          color: getRankTextColor(rank, defaultTextColor),
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.7rem',
          fontWeight: 600,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {displayNumber}
      </Typography>
    </Box>
  );
};

export default RankBadge;
