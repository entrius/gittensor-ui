import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeModeProvider } from './hooks/useThemeMode';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      //refetchInterval: 5*60*1000     //reload every 5 min
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeModeProvider>
        <Router>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary variant="fullPage">
              <App />
            </ErrorBoundary>
          </QueryClientProvider>
        </Router>
      </ThemeModeProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
