import React from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export const GettingStarted: React.FC = () => (
  <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
    <Typography
      variant="h4"
      fontWeight="bold"
      sx={{
        mb: 6,
        fontFamily: '"JetBrains Mono", monospace',
        color: '#fff',
        textAlign: 'center',
      }}
    >
      Miner Onboarding Process
    </Typography>

    <Box sx={{ position: 'relative', mb: 8 }}>
      {/* Connecting Line (Desktop) */}
      <Box
        sx={{
          position: 'absolute',
          top: 24,
          left: '5%',
          right: '5%',
          height: 2,
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.05) 100%)',
          display: { xs: 'none', md: 'block' },
          zIndex: 0,
        }}
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 5, md: 0 }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'flex-start' }}
        sx={{ position: 'relative', zIndex: 1 }}
      >
        {[
          { step: 1, title: 'Get Keys', subtitle: 'Coldkey & Hotkey' },
          { step: 2, title: 'Register', subtitle: 'To Subnet' },
          { step: 3, title: 'Authorize', subtitle: 'Create GitHub PAT' },
          { step: 4, title: 'Deploy', subtitle: 'Setup Miner' },
          {
            step: 5,
            title: 'Earn',
            subtitle: 'Contribute & Get Paid',
            active: true,
          },
        ].map((item, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'row', md: 'column' },
              alignItems: 'center',
              gap: 2,
              width: { xs: '100%', md: 'auto' },
            }}
          >
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                bgcolor: '#0b0b0b', // Darker background for contrast
                border: '2px solid',
                borderColor: item.active
                  ? 'secondary.main'
                  : 'rgba(255,255,255,0.1)',
                color: item.active
                  ? 'secondary.main'
                  : 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                boxShadow: item.active
                  ? '0 0 20px rgba(255, 215, 0, 0.15)'
                  : 'none',
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}
            >
              {item.step}
            </Box>
            <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 'bold',
                  color: item.active ? 'secondary.main' : '#fff',
                  mb: 0.5,
                }}
              >
                {item.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.4,
                  display: 'block',
                  maxWidth: { md: 120 },
                  mx: { md: 'auto' },
                }}
              >
                {item.subtitle}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>

    <Box
      sx={{
        textAlign: 'center',
        p: 6,
        borderRadius: 4,
        background:
          'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: '#fff' }}>
        Ready to Deploy?
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
      >
        Follow our comprehensive documentation to set up your environment and
        start mining today.
      </Typography>
      <Button
        variant="contained"
        color="secondary"
        size="large"
        href="https://docs.gittensor.io/miner.html"
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<OpenInNewIcon />}
        sx={{
          px: 5,
          py: 1.5,
          fontSize: '1rem',
          fontWeight: 'bold',
          borderRadius: '50px',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.2)',
          textTransform: 'none',
        }}
      >
        View Miner Documentation
      </Button>
    </Box>
  </Box>
);
