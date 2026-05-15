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

/**
 * Determine whether the previous history entry likely belongs to this app.
 * We consider it safe to go back only when we have an explicit navigation
 * state marker (`fromApp`) set by internal links, **or** when the
 * `document.referrer` points to the same origin.
 */
function isInAppNavigation(): boolean {
  // If the previous navigation was performed by react-router (pushState),
  // the referrer stays the current origin. For truly external arrivals
  // (shared link, fresh tab, bookmark) the referrer is either empty or a
  // different origin.
  try {
    const referrer = document.referrer;
    if (!referrer) return false; // direct navigation, no referrer
    const refUrl = new URL(referrer);
    return refUrl.origin === window.location.origin;
  } catch {
    return false;
  }
}

const BackButton: React.FC<BackButtonProps> = ({
  label = 'Back',
  to,
  mb = 2,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { backTo?: string }) || {};

  const handleClick = () => {
    // Only step through browser history when the previous entry is
    // verifiably an in-app page. Otherwise fall back to a known route.
    if (isInAppNavigation() && window.history.length > 1) {
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
      {label}
    </Button>
  );
};

export default BackButton;
