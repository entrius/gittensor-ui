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

export const getRankIcon = (rank: number) => (
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
      borderColor:
        rank === 1
          ? alpha(RANK_COLORS.first, 0.4)
          : rank === 2
            ? alpha(RANK_COLORS.second, 0.4)
            : rank === 3
              ? alpha(RANK_COLORS.third, 0.4)
              : 'rgba(255, 255, 255, 0.15)',
      boxShadow:
        rank === 1
          ? `0 0 12px ${alpha(RANK_COLORS.first, 0.4)}, 0 0 4px ${alpha(RANK_COLORS.first, 0.2)}`
          : rank === 2
            ? `0 0 12px ${alpha(RANK_COLORS.second, 0.4)}, 0 0 4px ${alpha(RANK_COLORS.second, 0.2)}`
            : rank === 3
              ? `0 0 12px ${alpha(RANK_COLORS.third, 0.4)}, 0 0 4px ${alpha(RANK_COLORS.third, 0.2)}`
              : 'none',
    }}
  >
    <Typography
      component="span"
      sx={{
        color:
          rank === 1
            ? RANK_COLORS.first
            : rank === 2
              ? RANK_COLORS.second
              : rank === 3
                ? RANK_COLORS.third
                : 'rgba(255, 255, 255, 0.6)',
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
