import React from 'react';
import { Button, Box } from '@mui/material';
import { modeActiveTabSx } from '../utils/themeUtils';

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
  /** Status color — used as solid active background in light mode */
  color?: string;
  activeTextColor?: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  label,
  isActive,
  onClick,
  count,
  color,
}) => (
  <Button
    size="small"
    onClick={onClick}
    sx={(theme) => ({
      ...modeActiveTabSx(theme, isActive, {
        activeColor: color ?? theme.palette.status.neutral,
        darkHoverAlpha: 0.12,
      }),
      borderRadius: '8px',
      px: 1.5,
      py: 0.45,
      minWidth: 'auto',
      textTransform: 'none',
      fontSize: '0.8rem',
      fontWeight: isActive ? 600 : 400,
      border: 'none',
      transition: 'background-color 0.18s ease, color 0.18s ease',
    })}
  >
    {label}
    {count !== undefined && (
      <Box
        component="span"
        sx={{ opacity: 0.7, ml: '5px', fontSize: '0.72rem' }}
      >
        {count}
      </Box>
    )}
  </Button>
);

export default FilterButton;
