import {
  Card,
  CircularProgress,
  type SxProps,
  type Theme,
} from '@mui/material';
import type React from 'react';

interface LoadingCardProps {
  size?: number;
  sx?: SxProps<Theme>;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ size = 40, sx }) => (
  <Card
    sx={[{ p: 4, textAlign: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}
    elevation={0}
  >
    <CircularProgress size={size} sx={{ color: 'primary.main' }} />
  </Card>
);
