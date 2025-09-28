import React from "react";
import { AppLayout } from "./components/layout";
import { Route, Routes } from "react-router-dom";
import routes from "./routes";

const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {Object.values(routes).map((x) => (
          <Route key={x.path} {...x} />
        ))}
      </Route>
    </Routes>
  );
};

export default App;
