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
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0.75,
      lineHeight: 1.2,
      color: isActive ? activeTextColor : (t) => t.palette.text.secondary,
      backgroundColor: isActive ? 'surface.light' : 'surface.transparent',
      borderRadius: '6px',
      px: { xs: 1.25, sm: 1.5 },
      py: { xs: 0.5, sm: 0.65 },
      minHeight: 32,
      minWidth: fullWidth ? 0 : 'auto',
      textTransform: 'none',
      fontSize: { xs: '0.7rem', sm: '0.75rem' },
      fontWeight: isActive ? 600 : 500,
      border: isActive ? `1px solid ${color}` : '1px solid transparent',
      whiteSpace: 'nowrap',
      '&:hover': {
        backgroundColor: 'border.light',
      },
    }}
  >
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
      {label}
    </Box>
    {count !== undefined && (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          opacity: 0.72,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 'inherit',
        }}
      >
        {count}
      </Box>
    )}
  </Button>
);

export default FilterButton;
