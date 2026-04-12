import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Miners from './pages/Miners';
import Issues from './pages/Issues';
import Search from './pages/Search';
import Settings from './pages/Settings';
import MinerDetails from './pages/MinerDetails';
import RepositoryDetails from './pages/RepositoryDetails';
import PRDetails from './pages/PRDetails';
import IssueDetails from './pages/IssueDetails';
import FAQ from './components/FAQ';
import NotFound from './pages/NotFound';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider } from './contexts/SidebarContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SidebarProvider>
          <Router>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar />
              <main className="flex-1 overflow-hidden">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/miners" element={<Miners />} />
                  <Route path="/miners/details" element={<MinerDetails />} />
                  <Route path="/miners/repository" element={<RepositoryDetails />} />
                  <Route path="/miners/pr" element={<PRDetails />} />
                  <Route path="/issues" element={<Issues />} />
                  <Route path="/bounties" element={<Issues />} />
                  <Route path="/issues/details" element={<IssueDetails />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
            <Toaster position="bottom-right" richColors />
          </Router>
        </SidebarProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;