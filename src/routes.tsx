import React from 'react';
import { Navigate, matchPath, type PathRouteProps } from 'react-router-dom';

export type AppRoute = Omit<PathRouteProps, 'path'> & {
  name: string;
  path: string;
  showGlobalSearch?: boolean;
};

const CHUNK_RELOAD_SESSION_KEY = 'gt:chunk-reloaded';

/**
 * Wraps `React.lazy` with a one-shot recovery for stale-deploy chunk hashes.
 *
 * Vite emits hashed chunk filenames (e.g. `WatchlistPage-<hash>.js`). After a
 * deploy, the previous entry chunk references stale hashes that no longer
 * exist on the server, causing `import()` to fail with "Failed to fetch
 * dynamically imported module". Reloading `index.html` always fetches the
 * current entry chunk with up-to-date references.
 *
 * A sessionStorage flag prevents an infinite reload loop if the chunk is
 * genuinely missing (real 404, not a stale-hash 404).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyWithReload = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> =>
  React.lazy(() =>
    factory()
      .then((mod) => {
        // Successful chunk load — reset the recovery flag so any *future*
        // stale-deploy event also gets one fresh reload attempt.
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(CHUNK_RELOAD_SESSION_KEY);
        }
        return mod;
      })
      .catch((err: Error) => {
        const message = String(err?.message ?? err);
        const isChunkLoadError =
          /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
            message,
          );
        if (
          isChunkLoadError &&
          typeof window !== 'undefined' &&
          !window.sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY)
        ) {
          window.sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, '1');
          window.location.reload();
          // Resolve with an empty component while the reload is pending.
          return { default: (() => null) as unknown as T };
        }
        throw err;
      }),
  );

// main menu pages
const HomePage = lazyWithReload(() => import('./pages/HomePage'));
// AboutPage and FAQPage deleted — redirects inline below
const DashboardPage = lazyWithReload(
  () => import('./pages/dashboard/DashboardPage'),
);
const IssuesPage = lazyWithReload(() => import('./pages/IssuesPage'));
const SearchPage = lazyWithReload(() => import('./pages/search/SearchPage'));
const IssueDetailsPage = lazyWithReload(
  () => import('./pages/IssueDetailsPage'),
);
const TopMinersPage = lazyWithReload(() => import('./pages/TopMinersPage'));
const RepositoriesPage = lazyWithReload(
  () => import('./pages/RepositoriesPage'),
);
const MinerDetailsPage = lazyWithReload(
  () => import('./pages/MinerDetailsPage'),
);
const RepositoryDetailsPage = lazyWithReload(
  () => import('./pages/RepositoryDetailsPage'),
);
const PRDetailsPage = lazyWithReload(() => import('./pages/PRDetailsPage'));

const OnboardPage = lazyWithReload(() => import('./pages/OnboardPage'));
const WatchlistPage = lazyWithReload(() => import('./pages/WatchlistPage'));
const RepositoryRegistrationPage = lazyWithReload(
  () => import('./pages/RepositoryRegistrationPage'),
);

// 404 page
const NotFoundPage = lazyWithReload(() => import('./pages/NotFoundPage'));

const routesArray: AppRoute[] = [
  { name: 'home', path: '/', element: <HomePage /> },
  {
    name: 'dashboard',
    path: '/dashboard',
    element: <DashboardPage />,
    showGlobalSearch: true,
  },
  {
    name: 'issue-details',
    path: '/bounties/details',
    element: <IssueDetailsPage />,
  },
  {
    name: 'issues',
    path: '/bounties/:tab?',
    element: <IssuesPage />,
    showGlobalSearch: true,
  },
  { name: 'search', path: '/search', element: <SearchPage /> },
  {
    name: 'discoveries-redirect',
    path: '/discoveries',
    element: <Navigate to="/top-miners?timeline=discoveries" replace />,
  },
  {
    name: 'leaderboard',
    path: '/top-miners',
    element: <TopMinersPage />,
    showGlobalSearch: true,
  },
  {
    name: 'watchlist',
    path: '/watchlist',
    element: <WatchlistPage />,
    showGlobalSearch: true,
  },
  {
    name: 'repositories',
    path: '/repositories',
    element: <RepositoriesPage />,
    showGlobalSearch: true,
  },
  {
    name: 'miner-details',
    path: '/miners/details',
    element: <MinerDetailsPage />,
  },
  {
    name: 'repository-details',
    path: '/miners/repository',
    element: <RepositoryDetailsPage />,
  },
  {
    name: 'pr-details',
    path: '/miners/pr',
    element: <PRDetailsPage />,
  },
  {
    name: 'about',
    path: '/about',
    element: <Navigate to="/onboard?tab=about" replace />,
  },
  {
    name: 'faq',
    path: '/faq',
    element: <Navigate to="/onboard?tab=faq" replace />,
  },
  {
    name: 'onboard',
    path: '/onboard',
    element: <OnboardPage />,
  },
  {
    name: 'repository-registration',
    path: '/repository-registration',
    element: <RepositoryRegistrationPage />,
  },

  // 404 catch-all route (must be last)
  {
    name: 'not-found',
    path: '*',
    element: <NotFoundPage />,
  },
];

// Matches a pathname against app route definitions so layout code can
// read route-level UI metadata such as showGlobalSearch.
export const getRouteForPathname = (pathname: string) =>
  routesArray.find((route) =>
    matchPath({ path: route.path, end: true }, pathname),
  );

export default routesArray.reduce<Record<string, AppRoute>>((acc, x) => {
  acc[x.name] = x;
  return acc;
}, {});
