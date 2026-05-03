import React from 'react';
import { Button } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface ExplorerFilterButtonProps {
  label: string;
  count: number;
  color: string;
  selected: boolean;
  onClick: () => void;
}

const ExplorerFilterButton: React.FC<ExplorerFilterButtonProps> = ({
  label,
  count,
  color,
  selected,
  onClick,
}) => (
  <Button
    size="small"
    onClick={onClick}
    sx={(theme) => {
      const isDark = theme.palette.mode === 'dark';
      return {
        color: selected
          ? isDark
            ? theme.palette.text.primary
            : theme.palette.common.white
          : theme.palette.text.secondary,
        backgroundColor: selected
          ? isDark
            ? theme.palette.surface.light
            : color
          : 'transparent',
        borderRadius: '8px',
        px: { xs: 1, sm: 1.5 },
        py: { xs: 0.45, sm: 0.55 },
        minWidth: 'auto',
        textTransform: 'none',
        fontSize: { xs: '0.65rem', sm: '0.75rem' },
        fontWeight: selected ? 600 : 400,
        border:
          selected && isDark ? `1px solid ${color}` : '1px solid transparent',
        whiteSpace: 'nowrap',
        transition: 'background-color 0.18s ease, color 0.18s ease',
        '&:hover': {
          backgroundColor: selected
            ? isDark
              ? theme.palette.surface.light
              : color
            : alpha(theme.palette.text.primary, 0.06),
          color: selected
            ? isDark
              ? theme.palette.text.primary
              : theme.palette.common.white
            : theme.palette.text.primary,
        },
      };
    }}
  >
    {label}{' '}
    <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '0.7rem' }}>
      {count}
    </span>
  </Button>
);

export default ExplorerFilterButton;
