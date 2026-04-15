import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import { STATUS_COLORS } from '../theme';

interface ErrorFallbackProps {
  variant: 'fullPage' | 'inline';
  error: Error;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  variant,
  error,
  onReset,
}) => {
  const goHome = () => {
    window.location.assign('/dashboard');
  };

  const container =
    variant === 'fullPage'
      ? {
          minHeight: '100vh',
          width: '100%',
          backgroundColor: '#000',
          px: { xs: 3, md: 6 },
          py: { xs: 6, md: 10 },
        }
      : {
          minHeight: '60vh',
          width: '100%',
          px: { xs: 2, md: 4 },
          py: { xs: 4, md: 6 },
        };

  return (
    <Box
      sx={{
        ...container,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack
        spacing={2.5}
        alignItems="flex-start"
        sx={{ maxWidth: 560, width: '100%' }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 42, color: STATUS_COLORS.closed }} />
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            color: '#fff',
            fontWeight: 500,
          }}
        >
          Something went wrong rendering this view.
        </Typography>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6,
          }}
        >
          The error has been logged. You can try this view again or return to
          the dashboard.
        </Typography>
        <Box
          component="pre"
          sx={{
            width: '100%',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 1,
            p: 1.5,
            m: 0,
            overflow: 'auto',
            maxHeight: 120,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.message}
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onReset}
            sx={{ textTransform: 'none' }}
          >
            Try again
          </Button>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={goHome}
            sx={{ textTransform: 'none' }}
          >
            {variant === 'fullPage' ? 'Go home' : 'Back to dashboard'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ErrorFallback;
