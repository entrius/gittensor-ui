import React from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  ButtonBase,
  Divider,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useLinkBehavior } from '../common/linkBehavior';

interface SidebarProps {
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const location = useLocation();

  const navItems = [
    { label: 'dashboard', path: '/dashboard' },
    { label: 'oss contributions', path: '/top-miners' },
    { label: 'discoveries', path: '/discoveries', badge: 'new' },
    { label: 'bounties', path: '/bounties' },
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
      <SidebarLogoLink onNavigate={onNavigate}>
        <img
          src="/gt-logo.svg"
          alt="Gittensor"
          style={{
            height: '60px',
            width: 'auto',
            filter:
              'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))',
          }}
        />
      </SidebarLogoLink>

      {/* Navigation */}
      <Stack direction="column" spacing={2}>
        {navItems.map((item) => (
          <SidebarNavLink
            key={item.path}
            path={item.path}
            label={item.label}
            badge={item.badge}
            isActive={location.pathname.startsWith(item.path)}
            onNavigate={onNavigate}
          />
        ))}
      </Stack>

      {/* Spacer to push footer to bottom */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Footer */}
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ borderColor: 'border.medium', mb: 2 }} />
        <Stack direction="column" spacing={1} alignItems="center">
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexWrap="wrap"
            justifyContent="center"
          >
            <Typography
              variant="caption"
              component="a"
              href="https://docs.gittensor.io"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'text.primary',
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
                borderColor: 'border.medium',
                mx: 0.5,
                height: '12px',
                alignSelf: 'center',
              }}
            />
            <Typography
              variant="caption"
              component="a"
              href="https://docs.learnbittensor.org/resources/community-links"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'text.primary',
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
                borderColor: 'border.medium',
                mx: 0.5,
                height: '12px',
                alignSelf: 'center',
              }}
            />
            <Typography
              variant="caption"
              component="a"
              href="https://github.com/entrius/gittensor"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'text.primary',
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
                borderColor: 'border.medium',
                mx: 0.5,
                height: '12px',
                alignSelf: 'center',
              }}
            />
            <Typography
              variant="caption"
              component="a"
              href="https://x.com/gittensor_io"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'text.primary',
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

const SidebarLogoLink: React.FC<{
  onNavigate?: () => void;
  children: React.ReactNode;
}> = ({ onNavigate, children }) => {
  const linkProps = useLinkBehavior<HTMLAnchorElement>('/', {
    onClick: () => onNavigate?.(),
  });
  return (
    <ButtonBase
      component="a"
      disableRipple
      {...linkProps}
      sx={{
        mb: 3,
        justifyContent: 'center',
        width: '100%',
        py: 1,
      }}
    >
      {children}
    </ButtonBase>
  );
};

const SidebarNavLink: React.FC<{
  path: string;
  label: string;
  badge?: string;
  isActive: boolean;
  onNavigate?: () => void;
}> = ({ path, label, badge, isActive, onNavigate }) => {
  const linkProps = useLinkBehavior<HTMLAnchorElement>(path, {
    onClick: () => onNavigate?.(),
  });
  return (
    <Button
      component="a"
      {...linkProps}
      sx={{
        justifyContent: 'flex-start',
        py: 1.5,
        px: 2,
        color: '#ffffff',
        textDecoration: 'none',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.95rem',
        textTransform: 'none',
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        borderLeft: isActive ? '2px solid #ffffff' : '2px solid transparent',
        borderRadius: 0,
        textAlign: 'left',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: 'primary.main',
        },
      }}
    >
      {label}
      {badge && (
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
          {badge}
        </Typography>
      )}
    </Button>
  );
};

export default Sidebar;
