import React from 'react';
import {
  Box,
  Button,
  Tooltip,
  alpha,
  type SxProps,
  type Theme,
} from '@mui/material';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';

interface WatchlistClearButtonProps {
  count: number;
  itemNoun: string;
  onTrigger: () => void;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export const WatchlistClearButton: React.FC<WatchlistClearButtonProps> = ({
  count,
  itemNoun,
  onTrigger,
  size = 'small',
  sx,
}) => {
  const disabled = count <= 0;
  const label = disabled
    ? `No pinned ${itemNoun} to clear`
    : `Clear all ${count} pinned ${itemNoun}`;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;
    onTrigger();
  };

  return (
    <Tooltip title={label} placement="top" arrow>
      <Box component="span" sx={{ display: 'inline-flex', ...sx }}>
        <Button
          size={size}
          onClick={handleClick}
          disabled={disabled}
          aria-label={label}
          variant="text"
          color="error"
          startIcon={<DeleteSweepOutlinedIcon fontSize={size} />}
          sx={{
            minHeight: 30,
            px: 1,
            py: 0.4,
            borderRadius: 1.5,
            textTransform: 'none',
            fontSize: size === 'medium' ? '0.85rem' : '0.78rem',
            fontWeight: 600,
            color: disabled ? 'text.disabled' : 'error.light',
            transition: 'background-color 0.15s, color 0.15s',
            '&:hover': {
              color: 'error.main',
              backgroundColor: (theme) => alpha(theme.palette.error.main, 0.08),
            },
            '&.Mui-disabled': {
              color: 'text.disabled',
            },
            '& .MuiButton-startIcon': {
              mr: 0.75,
            },
          }}
        >
          Clear pinned {itemNoun}
        </Button>
      </Box>
    </Tooltip>
  );
};
