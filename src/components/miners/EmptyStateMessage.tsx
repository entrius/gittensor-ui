import React from 'react';
import { Box, Typography, alpha } from '@mui/material';

interface EmptyStateMessageProps {
  message: string;
}

const EmptyStateMessage: React.FC<EmptyStateMessageProps> = ({ message }) => {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography
        sx={{
          color: (t) => alpha(t.palette.text.primary, 0.5),
          fontSize: '0.9rem',
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default EmptyStateMessage;
