import React from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  ButtonBase,
  Divider,
  IconButton,
  useTheme,
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeMode } from '../../context/ThemeContext';

interface SidebarProps {
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const isDark = mode === 'dark';

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.(); // Call onNavigate if provided (for mobile drawer closing)
  };

  const navItems = [
    { label: 'dashboard', path: '/dashboard' },
    { label: 'issues', path: '/issues', badge: 'new' },
    { label: 'leaderboard', path: '/top-miners' },
    { label: 'repositories', path: '/repositories' },
    { label: 'onboard', path: '/onboard' },
  ];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        px: 3,
        py: 4,
      }}
    >
      {/* Logo */}
      <ButtonBase
        disableRipple
        onClick={() => handleNavigate('/')}
        sx={{
          mb: 3,
          justifyContent: 'center',
          width: '100%',
          py: 1,
        }}
      >
        <img
          src="/gt-logo.svg"
          alt="Gittensor"
          style={{
            height: '60px',
            width: 'auto',
            filter: isDark
              ? 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))'
              : 'brightness(0) drop-shadow(0 0 8px rgba(0, 0, 0, 0.15))',
          }}
        />
      </ButtonBase>

      {/* Navigation */}
      <Stack direction="column" spacing={2}>
        {navItems.map((item) => (
          <Button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            sx={{
              justifyContent: 'flex-start',
              py: 1.5,
              px: 2,
              color: 'text.primary',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.95rem',
              textTransform: 'none',
              backgroundColor:
                location.pathname === item.path
                  ? theme.palette.border.light
                  : 'transparent',
              borderLeft:
                location.pathname === item.path
                  ? `2px solid ${theme.palette.text.primary}`
                  : '2px solid transparent',
              borderRadius: 0,
              textAlign: 'left',
              '&:hover': {
                backgroundColor: theme.palette.border.subtle,
                color: 'primary.main',
              },
            }}
          >
            {item.label}
            {item.badge && (
              <Typography
                component="span"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  color: 'secondary.main',
                  fontStyle: 'italic',
                  ml: 1,
                }}
              >
                {item.badge}
              </Typography>
            )}
          </Button>
        ))}
      </Stack>

      {/* Spacer to push footer to bottom */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Theme Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
        <IconButton
          onClick={toggleTheme}
          size="small"
          sx={{
            color: 'text.secondary',
            border: `1px solid ${theme.palette.border.light}`,
            borderRadius: 2,
            px: 1.5,
            py: 0.5,
            transition: 'all 0.2s',
            '&:hover': {
              color: 'text.primary',
              backgroundColor: theme.palette.border.subtle,
            },
          }}
        >
          {isDark ? (
            <LightModeIcon sx={{ fontSize: 16 }} />
          ) : (
            <DarkModeIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ borderColor: theme.palette.border.medium, mb: 2 }} />
        <Stack direction="column" spacing={1} alignItems="center">
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexWrap="wrap"
            justifyContent="center"
          >
            <Typography
              color="text.primary"
              variant="caption"
              component="a"
              href="https://docs.gittensor.io"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '0.65rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Docs
            </Typography>
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor: theme.palette.border.medium,
                mx: 0.5,
                height: '12px',
                alignSelf: 'center',
              }}
            />
            <Typography
              color="text.primary"
              variant="caption"
              component="a"
              href="https://docs.learnbittensor.org/resources/community-links"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '0.65rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Community
            </Typography>
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor: theme.palette.border.medium,
                mx: 0.5,
                height: '12px',
                alignSelf: 'center',
              }}
            />
            <Typography
              color="text.primary"
              variant="caption"
              component="a"
              href="https://github.com/entrius/gittensor"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '0.65rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Github
            </Typography>
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor: theme.palette.border.medium,
                mx: 0.5,
                height: '12px',
                alignSelf: 'center',
              }}
            />
            <Typography
              color="text.primary"
              variant="caption"
              component="a"
              href="https://x.com/gittensor_io"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '0.65rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              X
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6rem',
              color: 'text.secondary',
            }}
          >
            © Gittensor 2026
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default Sidebar;
