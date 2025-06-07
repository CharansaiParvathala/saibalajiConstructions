
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

// Initialize toast swipe support
initToastSwipeSupport();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <AuthProvider>
            <App />
            <Toaster />
          </AuthProvider>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
