import React from 'react';
import { Button, Box } from '@mui/material';

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
  color: string;
  activeTextColor?: string;
  /** Full-width row (e.g. sidebar Filters); inactive rows get a light outline for even hit-targets. */
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
    fullWidth={fullWidth}
    onClick={onClick}
    sx={{
      color: isActive
        ? activeTextColor
        : fullWidth
          ? 'text.secondary'
          : 'text.tertiary',
      backgroundColor: isActive
        ? 'border.subtle'
        : fullWidth
          ? 'surface.subtle'
          : 'transparent',
      borderRadius: '6px',
      px: fullWidth ? 1.5 : 2,
      minWidth: 'auto',
      textTransform: 'none',
      fontSize: '0.8rem',
      border: isActive
        ? `1px solid ${color}`
        : fullWidth
          ? '1px solid'
          : '1px solid transparent',
      borderColor: isActive ? undefined : fullWidth ? 'border.light' : undefined,
      justifyContent: fullWidth ? 'space-between' : undefined,
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
