import React from 'react';
import { Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  /** Text to display on the button */
  label?: string;
  /** Path to navigate to when clicked */
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

  return (
    <Button
      variant="back"
      startIcon={<ArrowBackIcon sx={{ fontSize: '1rem !important' }} />}
      onClick={() => navigate(to)}
      sx={{ mb, alignSelf: 'flex-start' }}
    >
      {label}
    </Button>
  );
};

export default BackButton;
