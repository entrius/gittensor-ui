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
import theme from '../../theme';
import { getRouteForPathname } from '../../routes';

const AppLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  useOnNavigate(() => mainRef.current?.scrollTo(0, 0));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
            backgroundColor: 'background.default',
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
              width: 280,
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

      {/* Desktop Sidebar - Hidden on mobile, visible on larger screens */}
      {!isMobile && (
        <Box
          sx={{
            flexShrink: 0,
            width: '240px',
            minWidth: '240px',
            borderRight: `1px solid ${theme.palette.border.light}`,
          }}
        >
          <Sidebar />
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
          alignItems: 'center',
        }}
      >
        <Suspense fallback={<LoadingPage />}>
          {shouldShowGlobalSearch && (
            <Box
              sx={{
                width: '100%',
                maxWidth: 1200,
                pt: { xs: 1, md: 2 },
                px: { xs: 1, md: 0 },
                position: 'sticky',
                top: 0,
                zIndex: 500,
                backgroundColor: 'background.default',
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
