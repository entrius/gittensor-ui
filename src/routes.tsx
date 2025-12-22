import React from "react";
import { PathRouteProps } from "react-router-dom";

export type AppRoute = Omit<PathRouteProps, "path"> & {
  name: string;
  path: string;
};

// main menu pages
const HomePage = React.lazy(() => import("./pages/HomePage"));
const AboutPage = React.lazy(() => import("./pages/AboutPage"));
const FAQPage = React.lazy(() => import("./pages/FAQPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const RepositoriesPage = React.lazy(() => import("./pages/RepositoriesPage"));
const MinersPage = React.lazy(() => import("./pages/MinersPage"));
const MinerDetailsPage = React.lazy(() => import("./pages/MinerDetailsPage"));
const RepositoryDetailsPage = React.lazy(
  () => import("./pages/RepositoryDetailsPage"),
);
const PRDetailsPage = React.lazy(() => import("./pages/PRDetailsPage"));
const RoadmapPage = React.lazy(() => import("./pages/RoadmapPage"));
const IssuesPage = React.lazy(() => import("./pages/IssuesPage"));

// 404 page
const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));

const routesArray: AppRoute[] = [
  { name: "home", path: "/", element: <HomePage /> },
  { name: "dashboard", path: "/dashboard", element: <DashboardPage /> },
  { name: "miners", path: "/miners", element: <MinersPage /> },
  {
    name: "miner-details",
    path: "/miners/details",
    element: <MinerDetailsPage />,
  },
  {
    name: "repository-details",
    path: "/miners/repository",
    element: <RepositoryDetailsPage />,
  },
  {
    name: "pr-details",
    path: "/miners/pr",
    element: <PRDetailsPage />,
  },
  { name: "roadmap", path: "/roadmap", element: <RoadmapPage /> },
  { name: "about", path: "/about", element: <AboutPage /> },
  { name: "faq", path: "/faq", element: <FAQPage /> },
  {
    name: "repositories",
    path: "/repositories",
    element: <RepositoriesPage />,
  },
  {
    name: "issues",
    path: "/issues",
    element: <IssuesPage />,
  },

  // 404 catch-all route (must be last)
  {
    name: "not-found",
    path: "*",
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
