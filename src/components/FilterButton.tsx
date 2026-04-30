import React from 'react';
import { Button, Box } from '@mui/material';

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
  color: string;
  /** Color for the label when active. Default: 'text.primary'. */
  activeTextColor?: string;
  /**
   * 'compact' shrinks padding/font for dense toolbars (used inside the
   * miner explorer tables).
   */
  variant?: 'default' | 'compact';
}

const FilterButton: React.FC<FilterButtonProps> = ({
  label,
  isActive,
  onClick,
  count,
  color,
  activeTextColor = 'text.primary',
  variant = 'default',
}) => {
  const isCompact = variant === 'compact';
  return (
    <Button
      size="small"
      onClick={onClick}
      sx={{
        color: isActive
          ? activeTextColor
          : isCompact
            ? 'text.secondary'
            : 'text.tertiary',
        backgroundColor: isActive
          ? isCompact
            ? 'surface.light'
            : 'border.subtle'
          : 'transparent',
        borderRadius: '6px',
        px: isCompact ? { xs: 1, sm: 1.5 } : 2,
        py: isCompact ? { xs: 0.5, sm: 0.75 } : undefined,
        minWidth: 'auto',
        textTransform: 'none',
        fontSize: isCompact ? { xs: '0.65rem', sm: '0.75rem' } : '0.8rem',
        whiteSpace: isCompact ? 'nowrap' : undefined,
        border: isActive
          ? `1px solid ${color}`
          : '1px solid transparent',
        '&:hover': {
          backgroundColor: isCompact ? 'border.medium' : 'border.light',
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
            fontSize: isCompact ? '0.7rem' : '0.75rem',
          }}
        >
          {count}
        </Box>
      )}
    </Button>
  );
};

export default FilterButton;
