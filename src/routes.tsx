import React from "react";
import { PathRouteProps } from "react-router-dom";

export type AppRoute = Omit<PathRouteProps, "path"> & {
  name: string;
  path: string;
};

// main menu pages
const AboutPage = React.lazy(() => import("./pages/AboutPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const RepositoriesPage = React.lazy(() => import("./pages/RepositoriesPage"));
// const UnderConstructionPage = React.lazy(
//   () => import("./pages/UnderConstructionPage")
// );

// 404 page
const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));

const routesArray: AppRoute[] = [
  { name: "dashboard", path: "/", element: <DashboardPage /> },
  { name: "about", path: "/about", element: <AboutPage /> },
  {
    name: "repositories",
    path: "/repositories",
    element: <RepositoriesPage />,
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
