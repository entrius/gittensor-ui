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
  activeTextColor = 'text.primary',
}) => (
  <Button
    size="small"
    onClick={onClick}
    sx={{
      color: isActive ? activeTextColor : 'text.tertiary',
      backgroundColor: isActive ? 'border.subtle' : 'transparent',
      borderRadius: '6px',
      px: 2,
      minWidth: 'auto',
      textTransform: 'none',
      fontFamily: '"JetBrains Mono", monospace',
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
