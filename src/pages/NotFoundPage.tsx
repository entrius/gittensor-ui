import React from 'react';
import { Box, Button, Stack, Typography, alpha } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useLocation } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        width: '100%',
        px: { xs: 3, md: 6 },
      }}
    >
      <Stack
        spacing={2.5}
        alignItems="flex-start"
        sx={{ maxWidth: 520, width: '100%' }}
      >
        <SearchOffIcon
          sx={{
            fontSize: 48,
            color: (t) => alpha(t.palette.text.primary, 0.3),
          }}
        />
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: { xs: '1.5rem', md: '2rem' },
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          Page not found
        </Typography>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            color: (t) => alpha(t.palette.text.primary, 0.5),
            lineHeight: 1.6,
          }}
        >
          The URL you followed doesn't match any page. It may have been moved or
          removed.
        </Typography>
        <Box
          component="pre"
          sx={{
            width: '100%',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.75rem',
            color: (t) => alpha(t.palette.text.primary, 0.4),
            border: '1px solid',
            borderColor: 'border.light',
            borderRadius: 1,
            p: 1.5,
            m: 0,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {location.pathname}
          {location.search}
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ textTransform: 'none' }}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
              borderColor: 'border.medium',
            }}
          >
            Go back
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default NotFoundPage;
