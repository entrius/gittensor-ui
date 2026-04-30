import React from 'react';
import { AppLayout } from './components/layout';
import { Route, Routes } from 'react-router-dom';
import routes from './routes';

const App: React.FC = () => {
  const allRoutes = Object.values(routes);
  const standaloneRoutes = allRoutes.filter((r) => r.standalone);
  const shellRoutes = allRoutes.filter((r) => !r.standalone);

  return (
    <Routes>
      {standaloneRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
      <Route element={<AppLayout />}>
        {shellRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>
    </Routes>
  );
};

export default App;
