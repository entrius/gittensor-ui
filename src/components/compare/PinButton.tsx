import React from 'react';
import { IconButton, Tooltip, type SxProps, type Theme } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { usePulseBoard } from '../../hooks/usePulseBoard';

interface PinButtonProps {
  githubId: string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export const PinButton: React.FC<PinButtonProps> = ({
  githubId,
  size = 'small',
  sx,
}) => {
  const { isPinned, canPin, togglePin } = usePulseBoard();
  const pinned = isPinned(githubId);
  const disabled = !pinned && !canPin;

  const label = pinned
    ? 'Unpin from Pulse Board'
    : disabled
      ? 'Unpin a miner first (max 4)'
      : 'Pin to Pulse Board';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!githubId || disabled) return;
    togglePin(githubId);
  };

  return (
    <Tooltip title={label} placement="top" arrow>
      <span>
        <IconButton
          size={size}
          onClick={handleClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={pinned}
          sx={{
            color: pinned ? 'primary.main' : 'text.tertiary',
            transition: 'color 0.15s, transform 0.15s',
            '&:hover': {
              color: 'primary.light',
              transform: 'scale(1.08)',
              backgroundColor: 'rgba(255,255,255,0.06)',
            },
            '&.Mui-disabled': {
              color: 'text.tertiary',
              opacity: 0.4,
            },
            ...sx,
          }}
        >
          {pinned ? (
            <PushPinIcon fontSize={size === 'medium' ? 'medium' : 'small'} />
          ) : (
            <PushPinOutlinedIcon
              fontSize={size === 'medium' ? 'medium' : 'small'}
            />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
};
