import React from 'react';
import { AppLayout } from './components/layout';
import { Route, Routes } from 'react-router-dom';
import routes from './routes';

const App: React.FC = () => (
  <Routes>
    <Route element={<AppLayout />}>
      {Object.values(routes).map((route) => {
        const routeProps = {
          path: route.path,
          element: route.element,
        };

        return <Route key={route.path} {...routeProps} />;
      })}
    </Route>
  </Routes>
);

export default App;
