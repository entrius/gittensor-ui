import React, { Suspense, useRef, useState } from 'react';
import {
  Box,
  useMediaQuery,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
  Tooltip,
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Outlet, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useThemeMode } from '../../hooks/useThemeMode';
import { LoadingPage } from '../../pages';
import useOnNavigate from '../../hooks/useOnNavigate';
import { Sidebar } from '..';
import ErrorBoundary from '../ErrorBoundary';
import GlobalSearchBar from './GlobalSearchBar';
import { scrollbarSx } from '../../theme';
import { getRouteForPathname } from '../../routes';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;

const AppLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const theme = useTheme();
  useOnNavigate(() => mainRef.current?.scrollTo(0, 0));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isCompactDesktop = useMediaQuery(theme.breakpoints.down('lg'));
  const isDark = theme.palette.mode === 'dark';
  const { toggleMode } = useThemeMode();
  const themeToggleLabel = isDark
    ? 'Switch to light mode'
    : 'Switch to dark mode';
  const drawerTintColor = isDark
    ? theme.palette.common.white
    : theme.palette.common.black;
  const mobileLogoFilter = isDark
    ? `brightness(0) invert(1) drop-shadow(0 0 6px ${alpha(theme.palette.common.white, 0.8)})`
    : 'brightness(0)';
  const isDesktopSidebarCollapsed = !isMobile && isCompactDesktop;
  const [mobileOpen, setMobileOpen] = useState(false);
  const shouldShowGlobalSearch = Boolean(
    getRouteForPathname(location.pathname)?.showGlobalSearch,
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100vw',
        minHeight: '100vh',
        height: '100vh',
        overflow: 'hidden',
        justifyContent: 'center', // Center for ultra-wide screens
      }}
    >
      {/* Mobile Header with Hamburger Menu */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            // Use paper (white in light mode) so the header looks like a
            // distinct panel separate from the grey canvas below it.
            backgroundColor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
          elevation={0}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <img
              src="/gt-logo.svg"
              alt="Gittensor"
              style={{
                height: '40px',
                width: 'auto',
                filter: mobileLogoFilter,
              }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title={themeToggleLabel} arrow>
              <IconButton
                size="small"
                onClick={toggleMode}
                aria-label={themeToggleLabel}
                sx={{ color: 'text.primary' }}
              >
                {isDark ? (
                  <LightModeIcon fontSize="small" />
                ) : (
                  <DarkModeIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280,
              // Sidebar uses canvas.subtle (#f6f8fa) — matches GitHub's left nav style.
              backgroundColor: theme.palette.surface.subtle,
              backgroundImage: `linear-gradient(${alpha(drawerTintColor, 0.04)}, ${alpha(drawerTintColor, 0.04)})`,
              borderRight: `1px solid ${theme.palette.border.light}`,
            },
            '& .MuiBackdrop-root': {
              backgroundColor: alpha(theme.palette.common.black, 0.7),
            },
          }}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      {/* Desktop Sidebar — auto-collapses by breakpoint (no manual toggle). */}
      {!isMobile && (
        <Box
          sx={{
            flexShrink: 0,
            width: isDesktopSidebarCollapsed
              ? `${SIDEBAR_COLLAPSED_WIDTH}px`
              : `${SIDEBAR_WIDTH}px`,
            minWidth: isDesktopSidebarCollapsed
              ? `${SIDEBAR_COLLAPSED_WIDTH}px`
              : `${SIDEBAR_WIDTH}px`,
            borderRight: `1px solid ${theme.palette.border.light}`,
            overflow: 'hidden',
            transition: 'width 0.2s ease, min-width 0.2s ease',
            // Sidebar uses canvas.subtle (#f6f8fa) — matches GitHub's left nav style.
            backgroundColor: theme.palette.surface.subtle,
          }}
        >
          <Sidebar collapsed={isDesktopSidebarCollapsed} />
        </Box>
      )}

      {/* Main Content Area - Constrained for ultra-wide screens */}
      <Box
        ref={mainRef}
        component="main"
        sx={{
          flexGrow: 1,
          maxWidth: '1920px', // Max content width for ultra-wide screens
          width: '100%',
          height: { xs: 'calc(100vh - 64px)', md: '100vh' },
          mt: { xs: '64px', md: 0 },
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 1, sm: 2, md: 3 },
          ...scrollbarSx,
          alignItems: 'center',
        }}
      >
        <Suspense fallback={<LoadingPage />}>
          {shouldShowGlobalSearch && (
            <Box
              sx={{
                width: '100%',
                pt: { xs: 1, md: 1.5 },
                pb: { xs: 1, md: 1.5 },
                px: { xs: 2, md: 3 },
                position: 'sticky',
                top: 0,
                zIndex: 500,
                backgroundColor: 'background.default',
                borderBottom: `1px solid ${theme.palette.border.light}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <GlobalSearchBar />
              </Box>
            </Box>
          )}
          <ErrorBoundary variant="inline" resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </Suspense>
      </Box>
    </Box>
  );
};

export default AppLayout;
