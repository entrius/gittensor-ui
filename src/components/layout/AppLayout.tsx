import React, { Suspense, useRef, useState } from 'react';
import {
  Box,
  useMediaQuery,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
  alpha,
} from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import { LoadingPage } from '../../pages';
import useOnNavigate from '../../hooks/useOnNavigate';
import { Sidebar } from '..';
import ErrorBoundary from '../ErrorBoundary';
import GlobalSearchBar from './GlobalSearchBar';
import theme, { scrollbarSx } from '../../theme';
import { getRouteForPathname } from '../../routes';

const SIDEBAR_WIDTH = 240;
const MOBILE_APP_BAR_HEIGHT = 56;
const SIDEBAR_COLLAPSED_WIDTH = 72;

const AppLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  useOnNavigate(() => mainRef.current?.scrollTo(0, 0));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompactDesktop = useMediaQuery(theme.breakpoints.down('lg'));
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
        width: '100%',
        minHeight: '100dvh',
        height: '100dvh',
        overflow: 'hidden',
        justifyContent: 'center', // Center for ultra-wide screens
      }}
    >
      {/* Mobile Header with Hamburger Menu */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            backgroundColor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
          elevation={0}
        >
          <Toolbar sx={{ minHeight: `${MOBILE_APP_BAR_HEIGHT}px !important` }}>
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
                height: '32px',
                width: 'auto',
                filter: `brightness(0) invert(1) drop-shadow(0 0 6px ${alpha(theme.palette.common.white, 0.8)})`,
              }}
            />
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
              width: { xs: '100%', sm: 320 },
              backgroundColor: 'background.default',
              backgroundImage: `linear-gradient(${alpha(theme.palette.common.white, 0.05)}, ${alpha(theme.palette.common.white, 0.05)})`,
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
          height: { xs: `calc(100dvh - ${MOBILE_APP_BAR_HEIGHT}px)`, sm: '100dvh' },
          mt: { xs: `${MOBILE_APP_BAR_HEIGHT}px`, sm: 0 },
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 1, sm: 2, md: 3 },
          ...scrollbarSx,
          alignItems: { xs: 'stretch', md: 'center' },
        }}
      >
        <Suspense fallback={<LoadingPage />}>
          {shouldShowGlobalSearch && (
            <Box
              sx={{
                width: '100%',
                pt: { xs: 1, md: 1.5 },
                pb: { xs: 1, md: 1.5 },
                px: { xs: 1, sm: 2, md: 3 },
                position: 'sticky',
                top: 0,
                zIndex: 500,
                backgroundColor: 'background.default',
                borderBottom: `1px solid ${theme.palette.border.light}`,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <GlobalSearchBar />
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
