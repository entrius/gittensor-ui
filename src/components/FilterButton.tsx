import React from 'react';
import { Button, Box } from '@mui/material';

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
  color: string;
  activeTextColor?: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  label,
  isActive,
  onClick,
  count,
  color,
  activeTextColor: _activeTextColor = 'text.primary',
}) => (
  <Button
    size="small"
    onClick={onClick}
    sx={{
      color: isActive ? color : 'text.tertiary',
      backgroundColor: isActive ? 'surface.elevated' : 'transparent',
      borderRadius: '6px',
      px: 2,
      minWidth: 'auto',
      textTransform: 'none',
      fontSize: '0.8rem',
      border: '1px solid',
      borderColor: isActive ? color : 'transparent',
      '&:hover': {
        backgroundColor: isActive ? 'surface.light' : 'border.light',
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
