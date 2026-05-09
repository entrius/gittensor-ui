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
      color: isActive ? activeTextColor : 'text.tertiary',
      backgroundColor: isActive ? 'border.subtle' : 'transparent',
      borderRadius: '6px',
      px: 2,
      minWidth: fullWidth ? 0 : 'auto',
      textTransform: 'none',
      fontSize: '0.8rem',
      border: isActive ? `1px solid ${color}` : '1px solid transparent',
      '&:hover': {
        backgroundColor: 'border.light',
      },
    }}
  >
    {label}{' '}
    {count !== undefined && (
      <Box
        component="span"
        sx={{ opacity: 0.6, ml: '6px', fontSize: '0.75rem' }}
      >
        {count}
      </Box>
    )}
  </Button>
);

export default FilterButton;
