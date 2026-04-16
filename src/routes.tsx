import React from 'react';
import { matchPath, type PathRouteProps } from 'react-router-dom';

export type AppRoute = Omit<PathRouteProps, 'path'> & {
  name: string;
  path: string;
  showGlobalSearch?: boolean;
};

// main menu pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const FAQPage = React.lazy(() => import('./pages/FAQPage'));
const DashboardPage = React.lazy(
  () => import('./pages/dashboard/DashboardPage'),
);
const IssuesPage = React.lazy(() => import('./pages/IssuesPage'));
const SearchPage = React.lazy(() => import('./pages/search/SearchPage'));
const IssueDetailsPage = React.lazy(() => import('./pages/IssueDetailsPage'));
const TopMinersPage = React.lazy(() => import('./pages/TopMinersPage'));
const RepositoriesPage = React.lazy(() => import('./pages/RepositoriesPage'));
const MinerDetailsPage = React.lazy(() => import('./pages/MinerDetailsPage'));
const RepositoryDetailsPage = React.lazy(
  () => import('./pages/RepositoryDetailsPage'),
);
const PRDetailsPage = React.lazy(() => import('./pages/PRDetailsPage'));
const DiscoveriesPage = React.lazy(() => import('./pages/DiscoveriesPage'));
const OnboardPage = React.lazy(() => import('./pages/OnboardPage'));
const WatchlistPage = React.lazy(() => import('./pages/WatchlistPage'));

// 404 page
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const routesArray: AppRoute[] = [
  { name: 'home', path: '/', element: <HomePage />, showGlobalSearch: true },
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
    name: 'discoveries',
    path: '/discoveries',
    element: <DiscoveriesPage />,
    showGlobalSearch: true,
  },
  {
    name: 'top-miners',
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
  { name: 'about', path: '/about', element: <AboutPage /> },
  { name: 'faq', path: '/faq', element: <FAQPage /> },
  {
    name: 'onboard',
    path: '/onboard',
    element: <OnboardPage />,
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
