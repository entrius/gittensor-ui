import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Issues from './pages/Issues';
import IssueDetails from './pages/IssueDetails';
import Miners from './pages/Miners';
import MinerDetails from './pages/MinerDetails';
import RepositoryDetails from './pages/RepositoryDetails';
import PRDetails from './pages/PRDetails';
import Repositories from './pages/Repositories';
import FAQ from './components/FAQ';
import { Toaster } from 'react-hot-toast';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="issues" element={<Issues />} />
              <Route path="bounties" element={<Navigate to="/issues" replace />} />
              <Route path="issues/details" element={<IssueDetails />} />
              <Route path="miners" element={<Miners />} />
              <Route path="miners/details" element={<MinerDetails />} />
              <Route path="miners/repository" element={<RepositoryDetails />} />
              <Route path="miners/pr" element={<PRDetails />} />
              <Route path="repositories" element={<Repositories />} />
              <Route path="faq" element={<FAQ />} />
            </Route>
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;