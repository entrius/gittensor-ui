import React, { Suspense, useRef, useState } from 'react';
import {
  Box,
  useMediaQuery,
  useTheme,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
} from '@mui/material';
import { Outlet } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import { LoadingPage } from '../../pages';
import useOnNavigate from '../../hooks/useOnNavigate';
import { Sidebar } from '..';

const AppLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  useOnNavigate(() => mainRef.current?.scrollTo(0, 0));
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

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
                filter: isDark
                  ? 'brightness(0) invert(1) drop-shadow(0 0 6px rgba(255, 255, 255, 0.8))'
                  : 'brightness(0) drop-shadow(0 0 6px rgba(0, 0, 0, 0.15))',
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
              backgroundColor: theme.palette.background.default,
              backgroundImage: `linear-gradient(${theme.palette.surface.light}, ${theme.palette.surface.light})`,
              borderRight: `1px solid ${theme.palette.border.light}`,
            },
            '& .MuiBackdrop-root': {
              backgroundColor: isDark
                ? 'rgba(0, 0, 0, 0.7)'
                : 'rgba(0, 0, 0, 0.3)',
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
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 1, sm: 2, md: 3 },
          pt: isMobile ? '64px' : 0, // Padding for mobile header
          alignItems: 'center',
        }}
      >
        <Suspense fallback={<LoadingPage />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
};

export default AppLayout;
