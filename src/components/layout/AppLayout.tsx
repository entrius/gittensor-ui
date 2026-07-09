import React, { Suspense, useRef } from 'react';
import { Box, Link, Stack, Typography, alpha } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { LoadingPage } from '../../pages';
import useOnNavigate from '../../hooks/useOnNavigate';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import ErrorBoundary from '../ErrorBoundary';
import { LinkBox } from '../common/linkBehavior';
import GlobalSearchBar from './GlobalSearchBar';
import ShortcutsHelpDialog from './ShortcutsHelpDialog';
import theme, { scrollbarSx } from '../../theme';
import { getRouteForPathname } from '../../routes';

const FOOTER_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Docs', href: 'https://docs.gittensor.io' },
  {
    label: 'Community',
    href: 'https://docs.learnbittensor.org/resources/community-links',
  },
  { label: 'Github', href: 'https://github.com/entrius/gittensor' },
  { label: 'X', href: 'https://x.com/gittensor_io' },
];

const Footer: React.FC = () => (
  <Box
    component="footer"
    sx={{
      mt: 'auto',
      width: '100%',
      py: 3,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1,
      borderTop: `1px solid ${theme.palette.border.light}`,
    }}
  >
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
    >
      {FOOTER_LINKS.map((link, index) => (
        <React.Fragment key={link.href}>
          {index > 0 && (
            <Box
              component="span"
              sx={{
                color: alpha(theme.palette.text.primary, 0.2),
                fontSize: '0.72rem',
              }}
            >
              |
            </Box>
          )}
          <Link
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            sx={{
              color: theme.palette.text.primary,
              fontFamily: 'var(--font-accent)',
              fontSize: '0.78rem',
              transition: 'color 0.15s ease',
              '&:hover': { color: theme.palette.status.merged },
            }}
          >
            {link.label}
          </Link>
        </React.Fragment>
      ))}
    </Stack>
    <Typography
      sx={{
        color: alpha(theme.palette.text.primary, 0.38),
        fontFamily: 'var(--font-accent)',
        fontSize: '0.7rem',
      }}
    >
      © Gittensor 2026
    </Typography>
  </Box>
);

const AppLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  useOnNavigate(() => mainRef.current?.scrollTo(0, 0));
  const { isHelpOpen, closeHelp, shortcuts } = useKeyboardShortcuts();
  const shouldShowGlobalSearch = Boolean(
    getRouteForPathname(location.pathname)?.showGlobalSearch,
  );
  const isLandingPage = location.pathname === '/';

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
      {/* One-click return to the landing page from anywhere */}
      {!isLandingPage && (
        <LinkBox
          href="/"
          title="Back to home"
          sx={{
            position: 'fixed',
            top: 16,
            left: 18,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            transition: 'transform 0.2s ease',
            '& img': {
              transition: 'filter 0.2s ease',
            },
            '&:hover': {
              transform: 'scale(1.12)',
            },
            '&:hover img': {
              filter: `brightness(0) invert(1) drop-shadow(0 0 12px ${alpha(theme.palette.common.white, 1)})`,
            },
          }}
        >
          <img
            src="/gt-logo.svg"
            alt="Gittensor home"
            style={{
              height: 24,
              width: 'auto',
              filter: `brightness(0) invert(1) drop-shadow(0 0 6px ${alpha(theme.palette.common.white, 0.7)})`,
            }}
          />
        </LinkBox>
      )}

      {/* Main Content Area - Constrained for ultra-wide screens */}
      <Box
        ref={mainRef}
        component="main"
        sx={{
          flexGrow: 1,
          maxWidth: '1920px', // Max content width for ultra-wide screens
          width: '100%',
          height: '100dvh',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 1, sm: 2, md: 3 },
          ...scrollbarSx,
          // Stretch cross-axis so routed pages keep width (`center` collapses `width:100%` children on md+).
          alignItems: 'stretch',
          minHeight: 0,
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
            <Box
              sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                flex: '1 0 auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Outlet />
            </Box>
          </ErrorBoundary>
          <Footer />
        </Suspense>
      </Box>
      <ShortcutsHelpDialog
        open={isHelpOpen}
        shortcuts={shortcuts}
        onClose={closeHelp}
      />
    </Box>
  );
};

export default AppLayout;
