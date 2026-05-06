import React from 'react';
import { IconButton, Tooltip, type SxProps, type Theme } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useWatchlist, type WatchlistCategory } from '../../hooks/useWatchlist';

interface WatchlistButtonProps {
  category: WatchlistCategory;
  itemKey: string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
  onToggle?: (nextWatched: boolean) => void;
}

export const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  category,
  itemKey,
  size = 'small',
  sx,
  onToggle,
}) => {
  const { isWatched, toggle } = useWatchlist(category);
  const watched = itemKey ? isWatched(itemKey) : false;
  const label = watched ? 'Remove from watchlist' : 'Add to watchlist';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!itemKey) return;
    const nextWatched = !watched;
    toggle(itemKey);
    onToggle?.(nextWatched);
  };

  return (
    <Tooltip title={label} placement="top" arrow>
      <IconButton
        size={size}
        onClick={handleClick}
        aria-label={label}
        aria-pressed={watched}
        sx={{
          color: watched ? 'warning.main' : 'text.tertiary',
          transition: 'color 0.15s, transform 0.15s',
          '&:hover': {
            color: 'warning.light',
            transform: 'scale(1.08)',
            backgroundColor: 'rgba(255,255,255,0.06)',
          },
          ...sx,
        }}
      >
        {watched ? (
          <StarIcon fontSize={size === 'medium' ? 'medium' : 'small'} />
        ) : (
          <StarBorderIcon fontSize={size === 'medium' ? 'medium' : 'small'} />
        )}
      </IconButton>
    </Tooltip>
  );
};
