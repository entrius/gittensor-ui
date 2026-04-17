import React from 'react';
import { IconButton, Tooltip, type SxProps, type Theme } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import {
  useWatchlist,
  type WatchlistCategory,
} from '../../hooks/useWatchlist';

interface WatchlistButtonProps {
  /** Backward-compatible: miner GitHub ID. */
  githubId?: string;
  /** Entity category (defaults to 'miners' when githubId is provided). */
  category?: WatchlistCategory;
  /** Unique key within the category (e.g. repo fullName, issue id, PR uid). */
  itemKey?: string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  githubId,
  category,
  itemKey,
  size = 'small',
  sx,
}) => {
  const { isWatched, isMinerWatched, toggle } = useWatchlist();

  // Resolve the effective category & key.
  // If only githubId is given (old usage), treat as miner.
  const effectiveCategory: WatchlistCategory =
    category ?? (githubId ? 'miners' : 'miners');
  const effectiveKey = itemKey ?? githubId ?? '';

  const watched = effectiveCategory === 'miners' && githubId && !itemKey
    ? isMinerWatched(githubId)
    : isWatched(effectiveCategory, effectiveKey);

  const label = watched ? 'Remove from watchlist' : 'Add to watchlist';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!effectiveKey) return;
    toggle(effectiveCategory, effectiveKey);
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
