import React from 'react';
import {
  Badge,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
  ButtonBase,
  Tooltip,
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useTheme, alpha } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BugReportIcon from '@mui/icons-material/BugReport';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import SchoolIcon from '@mui/icons-material/School';
import { useLinkBehavior } from '../common/linkBehavior';
import { useWatchlistTotalCount } from '../../hooks/useWatchlist';
import { useThemeMode } from '../../hooks/useThemeMode';

// In dark mode the SVG logo is inverted to white with a glow; in light mode
// the original dark artwork is preferred for contrast against a white surface.
const buildLogoFilter = (mode: 'dark' | 'light') =>
  mode === 'dark'
    ? 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))'
    : 'brightness(0)';

const COLLAPSED_LOGO_TOOLTIP_POPPER = {
  popperOptions: {
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [-10, 0],
        },
      },
    ],
  },
};

const NAV_ICON_FONT = '1.2rem';
const NAV_LABEL_FONT = '0.95rem';

const FOOTER_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Docs', href: 'https://docs.gittensor.io' },
  {
    label: 'Community',
    href: 'https://docs.learnbittensor.org/resources/community-links',
  },
  { label: 'Github', href: 'https://github.com/entrius/gittensor' },
  { label: 'X', href: 'https://x.com/gittensor_io' },
];

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

const GittensorLogoImg: React.FC<{
  heightPx: number;
  mode: 'dark' | 'light';
}> = ({ heightPx, mode }) => (
  <img
    src="/gt-logo.svg"
    alt="Gittensor"
    style={{
      height: `${heightPx}px`,
      width: 'auto',
      filter: buildLogoFilter(mode),
    }}
  />
);

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, collapsed = false }) => {
  const location = useLocation();
  const watchlistCount = useWatchlistTotalCount();
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === 'dark';
  const themeToggleLabel = isDark
    ? 'Switch to light mode'
    : 'Switch to dark mode';

  const navItems = [
    { label: 'dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { label: 'oss contributions', path: '/top-miners', icon: <GroupsIcon /> },
    {
      label: 'discoveries',
      path: '/discoveries',
      badge: 'new',
      icon: <AutoStoriesIcon />,
    },
    {
      label: 'watchlist',
      path: '/watchlist',
      badge: watchlistCount > 0 ? String(watchlistCount) : undefined,
      icon: <VisibilityIcon />,
    },
    { label: 'bounties', path: '/bounties', icon: <BugReportIcon /> },
    { label: 'repositories', path: '/repositories', icon: <FolderCopyIcon /> },
    { label: 'onboard', path: '/onboard', icon: <SchoolIcon /> },
  ];

  const logoLink = (
    <SidebarLogoLink onNavigate={onNavigate} collapsed={collapsed}>
      <GittensorLogoImg heightPx={collapsed ? 30 : 60} mode={mode} />
    </SidebarLogoLink>
  );

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        px: collapsed ? 1.5 : 3,
        pb: 4,
        pt: collapsed ? 8 : 4,
      }}
    >
      {collapsed ? (
        <Tooltip
          title="Gittensor"
          placement="right"
          arrow
          PopperProps={COLLAPSED_LOGO_TOOLTIP_POPPER}
        >
          <Box
            component="span"
            sx={{
              display: 'block',
              width: '100%',
              lineHeight: 0,
            }}
          >
            {logoLink}
          </Box>
        </Tooltip>
      ) : (
        logoLink
      )}

      <Stack direction="column" spacing={2}>
        {navItems.map((item) => (
          <SidebarNavLink
            key={item.path}
            path={item.path}
            label={item.label}
            badge={item.badge}
            icon={item.icon}
            isActive={location.pathname.startsWith(item.path)}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      {collapsed ? (
        <Tooltip title={themeToggleLabel} placement="right" arrow>
          <IconButton
            size="small"
            onClick={toggleMode}
            aria-label={themeToggleLabel}
            sx={{ color: 'text.secondary', mx: 'auto', display: 'flex' }}
          >
            {isDark ? (
              <LightModeIcon sx={{ fontSize: '1.1rem' }} />
            ) : (
              <DarkModeIcon sx={{ fontSize: '1.1rem' }} />
            )}
          </IconButton>
        </Tooltip>
      ) : (
        <Box
          sx={(theme) => ({
            mt: 2,
            pt: 2.25,
            borderTop: `1px solid ${theme.palette.border.light}`,
          })}
        >
          {/* Links — horizontal natural flow with animated underline on hover */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              columnGap: 2,
              rowGap: 0.75,
              mb: 2,
            }}
          >
            {FOOTER_LINKS.map((link) => (
              <Typography
                key={link.href}
                component="a"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                sx={(theme) => ({
                  position: 'relative',
                  color: theme.palette.text.secondary,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    bottom: -2,
                    width: 0,
                    height: '1px',
                    backgroundColor: theme.palette.text.primary,
                    transition: 'width 0.2s ease',
                  },
                  '&:hover': {
                    color: theme.palette.text.primary,
                  },
                  '&:hover::after': {
                    width: '100%',
                  },
                })}
              >
                {link.label}
              </Typography>
            ))}
          </Box>

          {/* Bottom row — copyright left, toggle right */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: 'text.disabled',
                letterSpacing: '0.02em',
              }}
            >
              © 2026 Gittensor
            </Typography>
            <Tooltip title={themeToggleLabel} arrow>
              <IconButton
                size="small"
                onClick={toggleMode}
                aria-label={themeToggleLabel}
                sx={{ color: 'text.secondary' }}
              >
                {isDark ? (
                  <LightModeIcon fontSize="small" />
                ) : (
                  <DarkModeIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const SidebarLogoLink: React.FC<{
  onNavigate?: () => void;
  collapsed?: boolean;
  children: React.ReactNode;
}> = ({ onNavigate, collapsed = false, children }) => {
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
        minHeight: collapsed ? 'auto' : 72,
        py: collapsed ? 0 : 1,
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
  icon: React.ReactNode;
  isActive: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
}> = ({
  path,
  label,
  badge,
  icon,
  isActive,
  onNavigate,
  collapsed = false,
}) => {
  const linkProps = useLinkBehavior<HTMLAnchorElement>(path, {
    onClick: () => onNavigate?.(),
  });
  const theme = useTheme();
  const baseColor =
    theme.palette.mode === 'dark'
      ? theme.palette.common.white
      : theme.palette.common.black;

  const iconNode =
    collapsed && badge ? (
      <Badge
        badgeContent={badge}
        color="secondary"
        overlap="rectangular"
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          '& .MuiBadge-badge': {
            fontSize: badge === 'new' ? '0.45rem' : '0.55rem',
            height: 'auto',
            minWidth: '12px',
            py: 0.25,
            px: 0.5,
            lineHeight: 1.1,
            fontStyle: badge === 'new' ? 'italic' : 'normal',
          },
        }}
      >
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Badge>
    ) : (
      icon
    );

  const expandedLabel = !collapsed && (
    <Box
      component="span"
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 1,
        rowGap: 0.25,
        minWidth: 0,
        flex: '1 1 auto',
        textAlign: 'left',
      }}
    >
      <Box
        component="span"
        sx={{
          lineHeight: 1.35,
          fontSize: NAV_LABEL_FONT,
          color: 'inherit',
        }}
      >
        {label}
      </Box>
      {badge && (
        <Typography
          component="span"
          sx={{
            fontSize: '0.65rem',
            color: 'secondary.main',
            fontStyle: 'italic',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {badge}
        </Typography>
      )}
    </Box>
  );

  const button = (
    <Button
      component="a"
      {...linkProps}
      sx={{
        justifyContent: collapsed ? 'center' : 'flex-start',
        alignItems: 'center',
        minWidth: 0,
        py: collapsed ? 1.25 : 1.5,
        px: collapsed ? 1 : 2,
        color:
          theme.palette.mode === 'dark'
            ? 'text.primary'
            : isActive
              ? theme.palette.text.primary
              : theme.palette.text.secondary,
        textDecoration: 'none',
        fontSize: NAV_LABEL_FONT,
        textTransform: 'none',
        backgroundColor: isActive
          ? theme.palette.mode === 'dark'
            ? alpha(baseColor, 0.1)
            : theme.palette.surface.accent
          : 'transparent',
        borderLeft: collapsed
          ? 'none'
          : isActive
            ? `2px solid ${theme.palette.mode === 'dark' ? baseColor : theme.palette.text.primary}`
            : '2px solid transparent',
        borderRadius: collapsed ? 1.5 : 0,
        textAlign: collapsed ? 'center' : 'left',
        gap: collapsed ? 0 : 1,
        '& .MuiSvgIcon-root': {
          fontSize: NAV_ICON_FONT,
          display: 'block',
          flexShrink: 0,
        },
        '&:hover': {
          backgroundColor:
            theme.palette.mode === 'dark'
              ? alpha(baseColor, 0.05)
              : theme.palette.surface.light,
          color:
            theme.palette.mode === 'dark'
              ? 'primary.main'
              : theme.palette.text.primary,
        },
      }}
    >
      {iconNode}
      {expandedLabel}
    </Button>
  );

  if (collapsed) {
    return (
      <Tooltip title={label} placement="right" arrow>
        {button}
      </Tooltip>
    );
  }

  return button;
};

export default Sidebar;
