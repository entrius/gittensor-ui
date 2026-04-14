import { alpha, Box, Typography } from '@mui/material';
import { RANK_COLORS } from '../../theme';

export const headerCellStyle = {
  backgroundColor: 'rgba(18, 18, 20, 0.95)',
  backdropFilter: 'blur(8px)',
  color: '#ffffff',
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: '0.75rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  height: '48px',
  py: 1,
  boxSizing: 'border-box' as const,
};

export const bodyCellStyle = {
  color: '#ffffff',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  fontSize: '0.75rem',
  py: 0.75,
  height: '52px',
  boxSizing: 'border-box' as const,
};

const rankColorFor = (rank: number) => {
  if (rank === 1) return RANK_COLORS.first;
  if (rank === 2) return RANK_COLORS.second;
  if (rank === 3) return RANK_COLORS.third;
  return null;
};

export const getRankIcon = (rank: number) => {
  const color = rankColorFor(rank);

  return (
    <Box
      sx={{
        backgroundColor: '#000000',
        borderRadius: '2px',
        width: '22px',
        height: '22px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: '1px solid',
        borderColor: color ? alpha(color, 0.4) : 'rgba(255, 255, 255, 0.15)',
        boxShadow: color
          ? `0 0 12px ${alpha(color, 0.4)}, 0 0 4px ${alpha(color, 0.2)}`
          : 'none',
      }}
    >
      <Typography
        component="span"
        sx={{
          color: color ?? 'rgba(255, 255, 255, 0.6)',
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
