import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from './context/theme-provider';
import { LanguageProvider } from './context/language-context';
import { AuthProvider } from './context/auth-context';
import { Toaster } from './components/ui/sonner';
import { initToastSwipeSupport } from './utils/toast-swipe';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Initialize toast swipe support
initToastSwipeSupport();

// Create a client
const queryClient = new QueryClient();

// Router future flags configuration
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router {...routerConfig}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <LanguageProvider>
          <AuthProvider>
            <App />
            <Toaster />
          </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
