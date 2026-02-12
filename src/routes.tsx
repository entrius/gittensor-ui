import React from 'react';
import { type PathRouteProps } from 'react-router-dom';

export type AppRoute = Omit<PathRouteProps, 'path'> & {
  name: string;
  path: string;
};

// main menu pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const FAQPage = React.lazy(() => import('./pages/FAQPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const IssuesPage = React.lazy(() => import('./pages/IssuesPage'));
const IssueDetailsPage = React.lazy(() => import('./pages/IssueDetailsPage'));
const TopMinersPage = React.lazy(() => import('./pages/TopMinersPage'));
const RepositoriesPage = React.lazy(() => import('./pages/RepositoriesPage'));
const MinerDetailsPage = React.lazy(() => import('./pages/MinerDetailsPage'));
const RepositoryDetailsPage = React.lazy(
  () => import('./pages/RepositoryDetailsPage'),
);
const PRDetailsPage = React.lazy(() => import('./pages/PRDetailsPage'));
const OnboardPage = React.lazy(() => import('./pages/OnboardPage'));

// 404 page
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const routesArray: AppRoute[] = [
  { name: 'home', path: '/', element: <HomePage /> },
  { name: 'dashboard', path: '/dashboard', element: <DashboardPage /> },
  { name: 'issues', path: '/issues', element: <IssuesPage /> },
  {
    name: 'issue-details',
    path: '/issues/details',
    element: <IssueDetailsPage />,
  },
  { name: 'top-miners', path: '/top-miners', element: <TopMinersPage /> },
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

export const routePaths = routesArray.reduce<Record<string, AppRoute>>(
  (acc, x) => {
    acc[x.path] = x;
    return acc;
  },
  {},
);

export default routesArray.reduce<Record<string, AppRoute>>((acc, x) => {
  acc[x.name] = x;
  return acc;
}, {});
