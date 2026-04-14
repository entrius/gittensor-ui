import React from 'react';
import { Navigate } from 'react-router-dom';

const DiscoveriesPage: React.FC = () => (
  <Navigate to="/top-miners?mode=discovery" replace />
);

export default DiscoveriesPage;
