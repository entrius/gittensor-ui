import React from 'react';
import { Button, Box } from '@mui/material';

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
  color: string;
  activeTextColor?: string;
  /** When true, button stretches to fill its container (e.g. inside a grid cell). */
  fullWidth?: boolean;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  label,
  isActive,
  onClick,
  count,
  color,
  activeTextColor = 'text.primary',
  fullWidth = false,
}) => (
  <Button
    size="small"
    onClick={onClick}
    fullWidth={fullWidth}
    sx={{
      color: isActive ? activeTextColor : (t) => t.palette.text.secondary,
      backgroundColor: isActive ? 'surface.light' : 'surface.transparent',
      borderRadius: '6px',
      px: { xs: 1, sm: 1.5 },
      py: { xs: 0.5, sm: 0.75 },
      minWidth: fullWidth ? 0 : 'auto',
      textTransform: 'none',
      fontSize: { xs: '0.65rem', sm: '0.75rem' },
      border: isActive ? `1px solid ${color}` : '1px solid transparent',
      whiteSpace: 'nowrap',
      '&:hover': {
        backgroundColor: 'border.medium',
      },
    }}
  >
    {label}{' '}
    {count !== undefined && (
      <Box
        component="span"
        sx={{
          opacity: 0.6,
          ml: '6px',
          fontSize: { xs: '0.6rem', sm: '0.7rem' },
        }}
      >
        {count}
      </Box>
    )}
  </Button>
);

export default FilterButton;
