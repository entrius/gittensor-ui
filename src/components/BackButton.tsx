import React from 'react';
import { Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useLocation } from 'react-router-dom';

interface BackButtonProps {
  /** Text to display on the button (used as fallback if no state-based label) */
  label?: string;
  /** Path to navigate to when clicked (used as fallback if no history) */
  to: string;
  /** Additional margin bottom (in theme spacing units) */
  mb?: number;
}

const BackButton: React.FC<BackButtonProps> = ({
  label = 'Back',
  to,
  mb = 2,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state =
    (location.state as { backLabel?: string; backTo?: string }) || {};
  // `history.length > 1` alone isn't a reliable signal that the previous
  // entry is an in-app page — opening a deep link in a fresh tab counts
  // the browser's own previous entry, so `navigate(-1)` would leave the
  // app. Also require the referrer to be same-origin before stepping back.
  const canGoBack = (() => {
    if (typeof window === 'undefined') return false;
    if (window.history.length <= 1) return false;
    const ref = document.referrer;
    if (!ref) return false;
    try {
      return new URL(ref).origin === window.location.origin;
    } catch {
      return false;
    }
  })();
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

  return (
    <Button
      variant="back"
      startIcon={<ArrowBackIcon sx={{ fontSize: '1rem !important' }} />}
      onClick={handleClick}
      sx={{ mb, alignSelf: 'flex-start' }}
    >
      {displayLabel}
    </Button>
  );
};

export default BackButton;
