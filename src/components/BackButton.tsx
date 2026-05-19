import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useNavigate, useLocation } from 'react-router-dom';

interface BackButtonProps {
  /** Tooltip text (icon variant) or visible label (text variant). */
  label?: string;
  /** Fallback path when there is no history and no state-based backTo. */
  to: string;
  /**
   * `icon` — compact 32px ghost icon button, meant to sit inline beside a
   * page title. `text` — ghost link with chevron + label, for standalone
   * use such as error / empty states.
   */
  variant?: 'icon' | 'text';
}

const BackButton: React.FC<BackButtonProps> = ({
  label = 'Back',
  to,
  variant = 'icon',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state =
    (location.state as { backLabel?: string; backTo?: string }) || {};
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;
  const displayLabel = state.backLabel ?? label;

  const handleClick = () => {
    if (canGoBack) {
      navigate(-1);
      return;
    }

    if (state.backTo) {
      navigate(state.backTo);
      return;
    }

    navigate(to);
  };

  if (variant === 'text') {
    return (
      <Box
        component="button"
        type="button"
        onClick={handleClick}
        aria-label={displayLabel}
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 0.75,
          p: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: theme.palette.text.secondary,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.8rem',
          fontWeight: 500,
          letterSpacing: '0.3px',
          transition: 'color 0.18s ease',
          '&:hover': {
            color: theme.palette.text.primary,
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: '3px',
            borderRadius: '4px',
          },
        })}
      >
        <ArrowBackIosNewIcon sx={{ fontSize: '0.8rem' }} />
        {displayLabel}
      </Box>
    );
  }

  return (
    <Tooltip title={displayLabel} arrow placement="bottom">
      <IconButton
        onClick={handleClick}
        aria-label={displayLabel}
        size="small"
        disableRipple
        sx={(theme) => ({
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: '8px',
          color: theme.palette.text.secondary,
          border: `1px solid ${theme.palette.border.light}`,
          transition: 'all 0.18s ease',
          '&:hover': {
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.surface.subtle,
            borderColor: theme.palette.border.medium,
          },
        })}
      >
        <ArrowBackIosNewIcon sx={{ fontSize: '0.9rem' }} />
      </IconButton>
    </Tooltip>
  );
};

export default BackButton;
