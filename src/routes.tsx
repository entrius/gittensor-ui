import React from 'react';
import { Navigate, matchPath, type PathRouteProps } from 'react-router-dom';

export type AppRoute = Omit<PathRouteProps, 'path'> & {
  name: string;
  path: string;
  showGlobalSearch?: boolean;
};

/**
 * Wrap React.lazy so that a failed dynamic import (e.g. stale chunk hash
 * after a production deploy) triggers a single page reload instead of an
 * unrecoverable error boundary screen. After reload the browser fetches
 * the latest index.html which references the current chunk hashes.
 */
const lazyWithReload = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> =>
  React.lazy(() =>
    factory().catch(() => {
      window.location.reload();
      // Return a never-resolving promise so React Suspense stays mounted
      // while the reload happens.
      return new Promise<{ default: T }>(() => {});
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
