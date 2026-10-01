/**
 * main.jsx — Application entry point
 *
 * Auth state is managed by Zustand (authStore) with localStorage persistence.
 * Admin auth state is managed by AdminAuthContext (separate context).
 * AppProvider handles UI-level global state (sidebar, theme).
 *
 * Provider order: BrowserRouter → QueryClientProvider → AdminAuthProvider → AppProvider → App
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AppProvider, AdminAuthProvider } from '@/context';
import App from './App';
import './index.css';

// Initialize React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminAuthProvider>
          <AppProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#16162a',
                  color:      '#f1f1ff',
                  border:     '1px solid #2a2a4a',
                  borderRadius: '12px',
                  fontSize:   '14px',
                },
                success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
                error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
          </AppProvider>
        </AdminAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
