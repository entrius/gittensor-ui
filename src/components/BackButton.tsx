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
  label = 'Back to Leaderboard',
  to,
  mb = 2,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateLabel = (location.state as { backLabel?: string })?.backLabel;

  const handleClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(to);
    }
  };

  return (
    <Button
      variant="back"
      startIcon={<ArrowBackIcon sx={{ fontSize: '1rem !important' }} />}
      onClick={handleClick}
      sx={{ mb, alignSelf: 'flex-start' }}
    >
      {stateLabel || label}
    </Button>
  );
};

export default BackButton;
