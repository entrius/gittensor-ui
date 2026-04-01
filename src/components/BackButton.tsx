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
  const state = (location.state as { backTo?: string }) || {};
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

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
      {label}
    </Button>
  );
};

export default BackButton;
