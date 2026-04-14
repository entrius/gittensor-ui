import React from 'react';
import { Button } from '@mui/material';

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
  activeTextColor = '#fff',
}) => (
  <Button
    size="small"
    onClick={onClick}
    sx={{
      color: isActive ? activeTextColor : 'rgba(255,255,255,0.5)',
      backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
      borderRadius: '6px',
      px: 2,
      minWidth: 'auto',
      textTransform: 'none',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '0.8rem',
      border: isActive ? `1px solid ${color}` : '1px solid transparent',
      '&:hover': {
        backgroundColor: 'rgba(255,255,255,0.15)',
      },
    }}
  >
    {label}{' '}
    {count !== undefined && (
      <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '0.75rem' }}>
        {count}
      </span>
    )}
  </Button>
);

export default FilterButton;
