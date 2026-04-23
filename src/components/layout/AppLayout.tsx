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
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { LoadingPage } from '../../pages';
import useOnNavigate from '../../hooks/useOnNavigate';
import { Sidebar } from '..';
import ErrorBoundary from '../ErrorBoundary';
import GlobalSearchBar from './GlobalSearchBar';
import theme, { scrollbarSx } from '../../theme';
import { getRouteForPathname } from '../../routes';

const SIDEBAR_OPEN_STORAGE_KEY = 'gittensor.sidebar.open';
const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;

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

      {/* Desktop Sidebar — narrows to icon rail when collapsed (persisted). */}
      {!isMobile && (
        <Box
          sx={{
            flexShrink: 0,
            width: sidebarOpen
              ? `${SIDEBAR_WIDTH}px`
              : `${SIDEBAR_COLLAPSED_WIDTH}px`,
            minWidth: sidebarOpen
              ? `${SIDEBAR_WIDTH}px`
              : `${SIDEBAR_COLLAPSED_WIDTH}px`,
            borderRight: `1px solid ${theme.palette.border.light}`,
            overflow: 'hidden',
            transition: 'width 0.2s ease, min-width 0.2s ease',
          }}
        >
          <Sidebar collapsed={!sidebarOpen} />
        </Box>
      )}

      {/* Desktop collapse (top-right of expanded sidebar) / expand (top of collapsed rail) */}
      {!isMobile && sidebarOpen && (
        <Tooltip title="Collapse sidebar" placement="right" arrow>
          <IconButton
            size="medium"
            onClick={handleSidebarToggle}
            aria-label="Collapse sidebar"
            aria-expanded
            sx={{
              position: 'fixed',
              top: 12,
              left: SIDEBAR_WIDTH - 48,
              zIndex: 1300,
              cursor: 'pointer',
              color: theme.palette.text.secondary,
              '&:hover': { color: theme.palette.text.primary },
              '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
            }}
          >
            <MenuOpenIcon />
          </IconButton>
        </Tooltip>
      )}
      {!isMobile && !sidebarOpen && (
        <Tooltip title="Expand sidebar" placement="right" arrow>
          <IconButton
            size="medium"
            onClick={handleSidebarToggle}
            aria-label="Expand sidebar"
            aria-expanded={false}
            sx={{
              position: 'fixed',
              top: 12,
              /* Horizontally center in the collapsed rail (same axis as nav icons) */
              left: SIDEBAR_COLLAPSED_WIDTH / 2,
              transform: 'translateX(-50%)',
              zIndex: 1300,
              cursor: 'pointer',
              color: theme.palette.text.secondary,
              '&:hover': { color: theme.palette.text.primary },
              '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
            }}
          >
            <MenuIcon />
          </IconButton>
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
