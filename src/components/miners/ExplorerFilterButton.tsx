import React from 'react';
import { Button } from '@mui/material';

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
}) => {
  return (
    <Button
      size="small"
      onClick={onClick}
      sx={{
        color: selected ? 'text.primary' : (t) => t.palette.text.secondary,
        backgroundColor: selected ? 'surface.light' : 'surface.transparent',
        borderRadius: '6px',
        px: { xs: 1, sm: 1.5 },
        py: { xs: 0.5, sm: 0.75 },
        minWidth: 'auto',
        textTransform: 'none',
        fontSize: { xs: '0.65rem', sm: '0.75rem' },
        border: selected ? `1px solid ${color}` : '1px solid transparent',
        whiteSpace: 'nowrap',
        '&:hover': {
          backgroundColor: 'border.medium',
        },
      }}
    >
      {label}{' '}
      <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '0.7rem' }}>
        {count}
      </span>
    </Button>
  );
};

export default ExplorerFilterButton;
