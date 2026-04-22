import React, { Suspense, useEffect, useRef, useState } from 'react';
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
import { Outlet, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import { LoadingPage } from '../../pages';
import useOnNavigate from '../../hooks/useOnNavigate';
import { Sidebar } from '..';
import ErrorBoundary from '../ErrorBoundary';
import GlobalSearchBar from './GlobalSearchBar';
import theme, { scrollbarSx } from '../../theme';
import { getRouteForPathname } from '../../routes';

const SIDEBAR_OPEN_STORAGE_KEY = 'gittensor.sidebar.open';
const SIDEBAR_WIDTH = 240;

const PanelLeftIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
  </svg>
);

const readStoredSidebarOpen = (): boolean => {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
};

const AppLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  useOnNavigate(() => mainRef.current?.scrollTo(0, 0));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    readStoredSidebarOpen,
  );
  const shouldShowGlobalSearch = Boolean(
    getRouteForPathname(location.pathname)?.showGlobalSearch,
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_OPEN_STORAGE_KEY,
        sidebarOpen ? 'true' : 'false',
      );
    } catch {
      // storage unavailable (private mode) — toggle still works in-memory
    }
  }, [sidebarOpen]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev);
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

      {/* Desktop Sidebar - Hidden on mobile, visible on larger screens.
          Slides to 0 width when collapsed; a chevron button on its right
          edge toggles the state (persisted to localStorage). */}
      {!isMobile && (
        <Box
          sx={{
            flexShrink: 0,
            width: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0,
            minWidth: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0,
            borderRight: sidebarOpen
              ? `1px solid ${theme.palette.border.light}`
              : 'none',
            overflow: 'hidden',
            transition: 'width 0.2s ease, min-width 0.2s ease',
          }}
        >
          <Sidebar />
        </Box>
      )}

      {/* Sidebar open/close toggle (desktop only).
          - Open: a plain panel-left IconButton tucked into the sidebar's
            top-right corner.
          - Closed: shows the Gittensor logo at the top-left; on hover the
            logo swaps to the panel-left icon so the user sees what clicking
            does (ChatGPT-style affordance). */}
      {!isMobile && sidebarOpen && (
        <Tooltip title="Collapse sidebar" placement="right" arrow>
          <IconButton
            size="small"
            onClick={handleSidebarToggle}
            aria-label="Collapse sidebar"
            aria-expanded
            sx={{
              position: 'fixed',
              top: 12,
              left: SIDEBAR_WIDTH - 36,
              zIndex: 1300,
              cursor: 'pointer',
              color: theme.palette.text.secondary,
              '&:hover': { color: theme.palette.text.primary },
            }}
          >
            <PanelLeftIcon size={18} />
          </IconButton>
        </Tooltip>
      )}
      {!isMobile && !sidebarOpen && (
        <Tooltip title="Expand sidebar" placement="right" arrow>
          <Box
            component="button"
            type="button"
            onClick={handleSidebarToggle}
            aria-label="Expand sidebar"
            aria-expanded={false}
            sx={{
              position: 'fixed',
              top: 12,
              left: 12,
              zIndex: 1300,
              width: 32,
              height: 32,
              p: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 1,
              color: theme.palette.text.secondary,
              transition: 'background-color 0.15s ease, color 0.15s ease',
              '& .sidebar-toggle-logo': { display: 'flex' },
              '& .sidebar-toggle-chevron': { display: 'none' },
              '&:hover': {
                cursor: 'pointer',
                backgroundColor: alpha(theme.palette.text.primary, 0.08),
                color: theme.palette.text.primary,
                '& .sidebar-toggle-logo': { display: 'none' },
                '& .sidebar-toggle-chevron': { display: 'flex' },
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            }}
          >
            <Box
              className="sidebar-toggle-logo"
              sx={{
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              <img
                src="/gt-logo.svg"
                alt=""
                aria-hidden="true"
                style={{
                  width: '70%',
                  height: '70%',
                  filter: `brightness(0) invert(1) drop-shadow(0 0 4px ${alpha(theme.palette.common.white, 0.6)})`,
                }}
              />
            </Box>
            <Box
              className="sidebar-toggle-chevron"
              sx={{
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              <PanelLeftIcon size={18} />
            </Box>
          </Box>
        </Tooltip>
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
